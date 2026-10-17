import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { asAnon, asUser, withDb } from "./helpers/db";

/**
 * Issue #132 — real-Postgres coverage of the directory reads:
 *   get_public_articles() with p_query + word_count, and
 *   get_public_article_topics() — exercised as the `anon` role so the
 *   SECURITY DEFINER/publication boundary is proven end-to-end.
 */

async function makeStaff(client: Client): Promise<string> {
  const userId = randomUUID();
  await client.query("SET session_replication_role = 'replica'");
  try {
    await client.query(
      `INSERT INTO auth.users (
         id, instance_id, aud, role, email, encrypted_password,
         email_confirmed_at, created_at, updated_at,
         raw_app_meta_data, raw_user_meta_data
       ) VALUES (
         $1, '00000000-0000-0000-0000-000000000000',
         'authenticated', 'authenticated', $2, '',
         NOW(), NOW(), NOW(), '{}'::jsonb, '{}'::jsonb
       )`,
      [userId, `dbtest-staff-${userId}@example.invalid`]
    );
    await client.query(
      `INSERT INTO public.profiles (id, email, status, is_admin)
       VALUES ($1, $2, 'active', true)`,
      [userId, `dbtest-staff-${userId}@example.invalid`]
    );
  } finally {
    await client.query("SET session_replication_role = 'origin'");
  }
  return userId;
}

const DOC = (text: string) =>
  JSON.stringify([
    {
      type: "paragraph",
      content: [{ type: "text", text }],
      children: [],
    },
  ]);

async function makeArticle(
  client: Client,
  authorId: string,
  overrides: {
    title: string;
    topic?: string;
    tags?: string[];
    content?: string;
    summary?: string;
  }
): Promise<string> {
  const articleId = randomUUID();
  await client.query(
    `INSERT INTO public.articles (
       id, author_id, title, slug, summary, topic, tags, draft_content,
       last_edited_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $2)`,
    [
      articleId,
      authorId,
      overrides.title,
      `dbtest-${articleId.slice(0, 8)}`,
      overrides.summary ?? "db test summary",
      overrides.topic ?? null,
      overrides.tags ?? [],
      overrides.content ?? DOC("hello world"),
    ]
  );
  return articleId;
}

async function publishArticle(client: Client, staffId: string, articleId: string) {
  const { rows } = await asUser(client, staffId, () =>
    client.query(
      `SELECT status FROM public.publish_article($1, 0)`,
      [articleId]
    )
  );
  return rows[0];
}

describe("get_public_articles directory reads (#132)", () => {
  it("anon sees published articles with word_count; drafts stay hidden", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);

      const publishedId = await makeArticle(client, staffId, {
        title: "Neon portrait walkthrough",
        topic: "Portraits",
        tags: ["neon", "portrait"],
        content: DOC("one two three four five six seven eight nine ten"),
      });
      await publishArticle(client, staffId, publishedId);

      // Stays a draft — must never appear in the directory.
      await makeArticle(client, staffId, {
        title: "Secret draft playbook",
        content: DOC("draftonlymarker"),
      });

      const { rows } = await asAnon(client, () =>
        client.query(
          `SELECT slug, title, topic, tags, word_count, total_count
             FROM public.get_public_articles(1, 50, NULL, NULL)`
        )
      );

      const mine = rows.find((r) => r.title === "Neon portrait walkthrough");
      expect(mine).toBeDefined();
      expect(mine.topic).toBe("Portraits");
      expect(mine.tags).toEqual(["neon", "portrait"]);
      expect(Number(mine.word_count)).toBe(10);
      expect(rows.find((r) => r.title === "Secret draft playbook")).toBeUndefined();
    });
  });

  it("p_query matches title/summary/tags, never draft-only text, and is pattern-safe", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);

      const a = await makeArticle(client, staffId, {
        title: "Studio lighting basics",
        summary: "soft key light guide",
        content: DOC("hiddenmarker draft words"),
      });
      await publishArticle(client, staffId, a);

      const search = (q: string | null) =>
        asAnon(client, () =>
          client.query(
            `SELECT title FROM public.get_public_articles(1, 50, NULL, $1)`,
            [q]
          )
        );

      // Title match
      expect(
        (await search("studio lighting")).rows.map((r) => r.title)
      ).toContain("Studio lighting basics");

      // Summary match
      expect(
        (await search("key light")).rows.map((r) => r.title)
      ).toContain("Studio lighting basics");

      // Body text lives in the publication snapshot too — but a term that
      // exists in NO published field must not match. 'hiddenmarker' only
      // exists in content → excluded from the searchable projection.
      expect(
        (await search("hiddenmarker")).rows.map((r) => r.title)
      ).not.toContain("Studio lighting basics");

      // ILIKE metacharacters are escaped — '100%' must be literal.
      expect((await search("100%")).rows).toHaveLength(0);
      expect((await search("%")).rows).toHaveLength(0);

      // Topic filter composes with search.
      const { rows: topicRows } = await asAnon(client, () =>
        client.query(
          `SELECT title FROM public.get_public_articles(1, 50, 'Nope', $1)`,
          ["studio"]
        )
      );
      expect(topicRows).toHaveLength(0);
    });
  });

  it("get_public_article_topics returns only live-publication topics", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);

      const a = await makeArticle(client, staffId, {
        title: "Topic probe",
        topic: "dbtest-landscapes",
      });
      await publishArticle(client, staffId, a);
      // Draft with a different topic must not appear in facets.
      await makeArticle(client, staffId, {
        title: "Draft topic probe",
        topic: "dbtest-hidden",
      });

      const { rows } = await asAnon(client, () =>
        client.query(`SELECT topic, article_count FROM public.get_public_article_topics()`)
      );

      const topics = rows.map((r) => r.topic);
      expect(topics).toContain("dbtest-landscapes");
      expect(topics).not.toContain("dbtest-hidden");
    });
  });
});
