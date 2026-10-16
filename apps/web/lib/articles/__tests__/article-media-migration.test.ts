import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contract test for the article media SQL (#129) — the staging/public bucket
 * split, RLS and the RPC permission model are the security boundary, and unit
 * tests mock the DB, so these assertions guard what mocks can't see.
 */
const sql = readFileSync(
  join(
    __dirname,
    "../../../../../supabase/migrations/20261020000002_article_media.sql"
  ),
  "utf-8"
);

/** Slice a CREATE FUNCTION body: from its declaration to the closing $$;. */
function fnBody(name: string): string {
  const start = sql.indexOf(`FUNCTION public.${name}(`);
  expect(start, name).toBeGreaterThan(-1);
  const end = sql.indexOf("$$;", start);
  expect(end, name).toBeGreaterThan(start);
  return sql.slice(start, end + 3);
}

describe("article media migration", () => {
  it("creates a private staging bucket and a separate public bucket", () => {
    // staging is private, published is public — in that order in the VALUES.
    const staging = sql.indexOf(
      "'article-media',\n    'article-media',\n    FALSE"
    );
    const pub = sql.indexOf(
      "'article-media-public',\n    'article-media-public',\n    TRUE"
    );
    expect(staging).toBeGreaterThan(-1);
    expect(pub).toBeGreaterThan(-1);
    expect(pub).toBeGreaterThan(staging);
  });

  it("scopes staging storage access to editorial staff inside their own namespace", () => {
    for (const verb of ["select", "insert", "update", "delete"]) {
      const policy = new RegExp(
        `CREATE POLICY "article_media_staff_${verb}" ON storage\\.objects[\\s\\S]*?is_editorial_staff`,
        "i"
      );
      expect(sql, verb).toMatch(policy);
    }
    // Owner-scoped paths: staff/{uid}/articles/… on every staging policy.
    const policyBlock = sql.slice(
      sql.indexOf('CREATE POLICY "article_media_staff_select"'),
      sql.indexOf('CREATE POLICY "article_media_public_read"')
    );
    expect(
      policyBlock.match(
        /\(storage\.foldername\(name\)\)\[2\] = \(SELECT auth\.uid\(\)\)::text/g
      )?.length
    ).toBeGreaterThanOrEqual(5);
    expect(policyBlock).toContain("'staff'");
    expect(policyBlock).toContain("'articles'");
  });

  it("gives the public bucket read-only access with no authenticated write path", () => {
    expect(sql).toContain(
      'CREATE POLICY "article_media_public_read" ON storage.objects'
    );
    // There must be no INSERT/UPDATE/DELETE policy granting writes on the
    // public bucket to authenticated users — promotion is service-only.
    expect(
      sql.match(/CREATE POLICY "article_media_public_(insert|update|delete)"/gi)
    ).toBeNull();
  });

  it("enables RLS on article_assets with staff-only select and RPC-only writes", () => {
    expect(sql).toContain(
      "ALTER TABLE public.article_assets ENABLE ROW LEVEL SECURITY"
    );
    const policy = sql.slice(sql.indexOf("article_assets_staff_select"));
    expect(policy).toContain("is_editorial_staff");
    // Every policy on the table must be SELECT-only — writes are RPC-gated.
    const policies =
      sql.match(/CREATE POLICY \w+ ON public\.article_assets[^;]*/gi) ?? [];
    expect(policies.length).toBeGreaterThan(0);
    for (const p of policies) {
      expect(p).toContain("FOR SELECT");
    }
  });

  it("records provenance and consent for generation derivatives", () => {
    expect(sql).toContain("source_generation_id");
    expect(sql).toContain("source_asset_id");
    expect(sql).toContain("consent_confirmed_by");
    expect(sql).toContain("consent_confirmed_at");
  });

  it("guards every write RPC with the staff check", () => {
    const writeRpcs = [
      "create_article_media_upload",
      "finalize_article_media_upload",
      "register_article_generation_derivative",
      "update_article_media",
      "delete_article_media",
      "publish_article",
      "revoke_article_media",
      "confirm_article_media_revocation",
    ];
    for (const name of writeRpcs) {
      const body = fnBody(name);
      expect(body, name).toContain("is_editorial_staff");
      expect(body, name).toContain("42501");
    }
  });

  it("never grants a media write RPC to anon", () => {
    expect(sql).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.(create_article_media_upload|finalize_article_media_upload|register_article_generation_derivative|update_article_media|delete_article_media|publish_article|revoke_article_media|confirm_article_media_revocation|sweep_stale_article_uploads)[^;]*TO anon/
    );
  });

  it("requires generation ownership + completion inside the derivative RPC", () => {
    const fn = fnBody("register_article_generation_derivative");
    expect(fn).toContain("user_id = v_user");
    expect(fn).toContain("status = 'completed'");
    expect(fn).toContain("generation_not_publishable");
    // The staged object must provably exist before rows are written.
    expect(fn).toContain("storage.objects");
    expect(fn).toContain("staged_copy_missing");
  });

  it("derives staging and published keys inside the DB — no caller-chosen paths", () => {
    const register = fnBody("register_article_generation_derivative");
    expect(register).toContain("'staff/' || v_user::text || '/articles/'");
    const publish = fnBody("publish_article");
    expect(publish).toContain("'articles/' || aa.article_id::text");
  });

  it("validates media refs and promoted objects inside the publish transaction", () => {
    const publish = fnBody("publish_article");
    // Collects document refs + cover.
    expect(publish).toContain("article_document_asset_ids");
    expect(publish).toContain("v_article.cover_asset_id");
    // Rejects forged/pending/cross-article refs and un-staged objects.
    expect(publish).toContain("media_ref_not_ready");
    expect(publish).toContain("media_not_promoted");
    expect(publish).toContain("storage.objects");
    expect(publish).toContain("aa.article_id = p_article_id");
    // Marks only the referenced assets, inside the publication transaction.
    expect(publish).toContain("aa.asset_id = ANY(v_refs)");
    // And happens BEFORE the publication snapshot is inserted.
    const markPos = publish.indexOf("SET state = 'published'");
    const insertPos = publish.indexOf("INSERT INTO public.article_publications");
    expect(markPos).toBeGreaterThan(-1);
    expect(insertPos).toBeGreaterThan(markPos);
  });

  it("de-publishes assets the new snapshot no longer references", () => {
    const publish = fnBody("publish_article");
    const depublish = publish.indexOf("NOT (aa.asset_id = ANY(v_refs))");
    expect(depublish).toBeGreaterThan(-1);
    // Their published_key is retained so the sweep can remove the objects.
    expect(publish).toContain("revoked_at = NOW()");
  });

  it("serializes upload reservations with a row lock on the article", () => {
    for (const name of [
      "create_article_media_upload",
      "register_article_generation_derivative",
      "publish_article",
      "save_article_draft",
    ]) {
      expect(fnBody(name), name).toContain("FOR UPDATE");
    }
  });

  it("refuses to delete media still referenced by draft, live publication or cover", () => {
    const del = fnBody("delete_article_media");
    expect(del).toContain("media_in_use");
    expect(del).toContain("ar.cover_asset_id = v_aa.asset_id");
    expect(del).toContain("ar.draft_content");
    expect(del).toContain("ar.current_publication_id");
    // The live publication's own cover slot too — a draft cover change
    // must not expose the cover still shown on the published snapshot.
    expect(del).toContain("ap.cover_asset_id");
  });

  it("revokes by flipping rows private BEFORE object deletion", () => {
    const revoke = fnBody("revoke_article_media");
    const flipPrivate = revoke.indexOf("visibility = 'private'");
    const returnKeys = revoke.indexOf("revoked_keys");
    expect(flipPrivate).toBeGreaterThan(-1);
    expect(revoke).toContain("bucket = 'article-media'");
    // keys for object deletion are returned AFTER the flip, so the app
    // deletes objects only once resolution has stopped.
    expect(returnKeys).toBeGreaterThan(flipPrivate);
  });

  it("resolves shared generations only while publicly shared and completed", () => {
    const fn = fnBody("resolve_article_generation");
    expect(fn).toContain("g.public_share_id IS NOT NULL");
    expect(fn).toContain("g.status = 'completed'");
    // Granted to anon — the public renderer needs it — but projection is fixed.
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.resolve_article_generation(UUID) TO anon, authenticated"
    );
    // Never exposes storage internals in the public projection.
    expect(fn).not.toContain("storage_key");
  });

  it("enforces file bounds and per-article quota in the DB", () => {
    const check = fnBody("article_media_check_file");
    expect(check).toContain("26214400"); // 25 MB image cap
    expect(check).toContain("104857600"); // 100 MB video cap
    const quota = fnBody("article_media_check_quota");
    expect(quota).toContain("536870912"); // 512 MB per-article
    expect(quota).toContain(">= 100"); // 100 assets per-article
  });

  it("rejects cover assets that are not verified media of the same article", () => {
    const save = fnBody("save_article_draft");
    expect(save).toContain("invalid_cover_asset");
    expect(save).toContain("aa.article_id = p_article_id");
    expect(save).toContain("aa.state IN ('ready', 'published')");
  });

  it("hardens every function with an empty search_path", () => {
    const funcs = sql.match(/CREATE OR REPLACE FUNCTION public\.\w+/g) ?? [];
    expect(funcs.length).toBeGreaterThan(8);
    for (const f of funcs) {
      const body = sql.slice(
        sql.indexOf(f),
        sql.indexOf("$$;", sql.indexOf(f)) + 3
      );
      expect(body, f).toContain("SET search_path = ''");
    }
  });
});
