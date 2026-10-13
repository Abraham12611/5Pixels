import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contract test for the articles foundation SQL — RLS and RPC details are the
 * security boundary for #124, and unit tests mock the DB, so these assertions
 * guard the invariants mocks can't see.
 */
const sql = readFileSync(
  join(
    __dirname,
    "../../../../../supabase/migrations/20261016000001_articles_foundation.sql"
  ),
  "utf-8"
);

describe("articles foundation migration", () => {
  it("enables RLS on all three articles tables", () => {
    for (const table of [
      "articles",
      "article_revisions",
      "article_publications",
    ]) {
      expect(sql).toContain(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`
      );
    }
  });

  it("staff role helper covers BOTH admins and owners", () => {
    // public.is_admin() alone does not include owners — the articles helper
    // must spell out the OR so owner-authored publishing works under RLS.
    const fn = sql.slice(sql.indexOf("FUNCTION public.is_editorial_staff"));
    expect(fn).toContain("is_admin OR is_owner");
  });

  it("grants staff-only SELECT on working rows; no direct writes for anyone", () => {
    for (const table of [
      "articles",
      "article_revisions",
      "article_publications",
    ]) {
      const policy = new RegExp(
        `CREATE POLICY \\w+ ON public\\.${table}[\\s\\S]*?FOR SELECT TO authenticated[\\s\\S]*?is_editorial_staff`
      );
      expect(sql).toMatch(policy);
    }
    // No INSERT/UPDATE/DELETE policies — all writes via SECURITY DEFINER RPCs.
    expect(sql).not.toMatch(/FOR\s+(INSERT|UPDATE|DELETE)\s+TO/i);
  });

  it("publishes atomically: row lock + optimistic version check + snapshot", () => {
    const publish = sql.slice(sql.indexOf("FUNCTION public.publish_article"));
    expect(publish).toContain("FOR UPDATE");
    expect(publish).toContain("edit_version_conflict");
    expect(publish).toContain("'publish'");
    expect(publish).toContain("INSERT INTO public.article_publications");
    expect(publish).toContain("status = 'published'");
    expect(publish).toContain("current_publication_id");
  });

  it("makes publications immutable", () => {
    expect(sql).toContain("prevent_article_publication_mutation");
    expect(sql).toContain(
      "BEFORE UPDATE OR DELETE ON public.article_publications"
    );
  });

  it("locks the slug after first publication", () => {
    const save = sql.slice(sql.indexOf("FUNCTION public.save_article_draft"));
    expect(save).toContain("slug_locked");
    expect(save).toContain("first_published_at IS NOT NULL");
  });

  it("enforces optimistic concurrency on draft saves", () => {
    const save = sql.slice(sql.indexOf("FUNCTION public.save_article_draft"));
    expect(save).toContain("p_expected_edit_version");
    expect(save).toContain("edit_version + 1");
    expect(save).toContain("FOR UPDATE");
  });

  it("bounds revision retention and protects published revisions", () => {
    const save = sql.slice(sql.indexOf("FUNCTION public.save_article_draft"));
    // Autosave and manual pruning both skip publication-referenced rows.
    expect(save.match(/DELETE FROM public\.article_revisions/g)?.length).toBe(2);
    expect(save.match(/NOT EXISTS[\s\S]*?article_publications/g)?.length).toBe(
      2
    );
  });

  it("exposes published content only through fixed-projection RPCs", () => {
    // Public reads join articles -> current publication snapshot.
    const pub = sql.slice(sql.indexOf("FUNCTION public.get_public_articles"));
    expect(pub).toContain("a.status = 'published'");
    expect(pub).toContain("current_publication_id");
    // Never returns draft_content, and never grants write-path functions to anon.
    expect(pub).not.toContain("draft_content");
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.get_public_articles(INT, INT, TEXT) TO anon, authenticated"
    );
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.get_public_article_by_slug(TEXT) TO anon, authenticated"
    );
    expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.(create_article|save_article_draft|publish_article|unpublish_article|archive_article|unarchive_article)[^;]*TO anon/);
  });

  it("guards every write RPC with the staff check", () => {
    const writeRpcs = [
      "create_article",
      "save_article_draft",
      "publish_article",
      "unpublish_article",
      "archive_article",
      "unarchive_article",
    ];
    for (const name of writeRpcs) {
      const start = sql.indexOf(`FUNCTION public.${name}`);
      const body = sql.slice(start, start + 1200);
      expect(body).toContain("is_editorial_staff");
      expect(body).toContain("42501");
    }
  });

  it("hardens every function with an empty search_path; definers stay definer+pinned", () => {
    // Every function — definer or plain — pins search_path (catalog precedent).
    const funcs = sql.match(/CREATE OR REPLACE FUNCTION public\.\w+/g) ?? [];
    expect(funcs.length).toBeGreaterThan(5);
    for (const f of funcs) {
      const name = f.replace("CREATE OR REPLACE FUNCTION public.", "");
      const body = sql.slice(
        sql.indexOf(f),
        sql.indexOf("$$;", sql.indexOf(f)) + 3
      );
      expect(body, name).toContain("SET search_path = ''");
    }
    // Definer functions must declare the two attributes adjacently.
    const definers = sql.match(/SECURITY DEFINER\s+SET search_path = ''/g) ?? [];
    expect(definers.length).toBeGreaterThanOrEqual(10);
  });

  it("bounds document size and enforces array shape in the DB", () => {
    expect(sql).toContain("pg_column_size(draft_content) <= 262144");
    expect(sql).toContain("jsonb_typeof(draft_content) = 'array'");
    expect(sql).toMatch(/jsonb_typeof\(content\) = 'array'/g);
  });

  it("enforces slug format and uniqueness at the DB level", () => {
    expect(sql).toContain("slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'");
    expect(sql).toContain(
      "CREATE UNIQUE INDEX idx_articles_slug ON public.articles(slug)"
    );
  });

  it("rejects spoofed authorship — writer identity is always auth.uid()", () => {
    const create = sql.slice(sql.indexOf("FUNCTION public.create_article"));
    expect(create).toContain("VALUES (v_user, v_title, v_slug, v_user)");
    const publish = sql.slice(sql.indexOf("FUNCTION public.publish_article"));
    expect(publish).toContain("published_by");
    expect(publish).toContain("v_user");
  });

  it("never exposes profile email or private fields in the public projection", () => {
    const pub = sql.slice(
      sql.indexOf("FUNCTION public.get_public_article_by_slug")
    );
    expect(pub).not.toContain("email");
    expect(pub).toContain("author_display_name");
    // Avatar/cover resolve only for public, non-deleted assets.
    expect(sql).toContain("a.visibility = 'public'");
    expect(sql).toContain("a.deleted_at IS NULL");
  });

  it("keeps unique (article_id, version) on revisions for optimistic saves", () => {
    expect(sql).toContain("UNIQUE (article_id, version)");
    expect(sql).toContain("UNIQUE (article_id, publication_number)");
  });
});
