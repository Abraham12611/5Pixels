import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contract test for the duplicate_article migration (#126) — the reviewer's
 * requirement was "handles article-owned media references securely instead of
 * blindly copying asset IDs": fresh article-scoped asset rows, rewritten
 * document references, pending-until-verified clones, and a draft that can
 * never inherit publication state.
 */
const sql = readFileSync(
  join(
    __dirname,
    "../../../../../supabase/migrations/20261024000001_duplicate_article.sql"
  ),
  "utf-8"
).replace(/\r\n/g, "\n"); // tolerate CRLF checkouts on Windows dev machines

const fn = sql.slice(sql.indexOf("FUNCTION public.duplicate_article"));

describe("duplicate_article migration", () => {
  it("is SECURITY DEFINER with an editorial-staff check and pinned search_path", () => {
    expect(fn).toContain("SECURITY DEFINER");
    expect(fn).toContain("SET search_path = ''");
    expect(fn).toContain("public.is_editorial_staff()");
    expect(fn).toContain("ERRCODE = '42501'");
  });

  it("creates a fresh unique slug so the copy never collides", () => {
    expect(fn).toContain("'-copy'");
    expect(fn).toMatch(/WHILE EXISTS[\s\S]*?slug = v_slug/);
  });

  it("the new article never carries over publication state", () => {
    const insert = fn.slice(
      fn.indexOf("INSERT INTO public.articles"),
      fn.indexOf("RETURNING * INTO v_new")
    );
    // The column list must not include live-publication fields.
    for (const forbidden of [
      "status",
      "current_publication_id",
      "first_published_at",
      "published_at",
    ]) {
      expect(insert).not.toContain(forbidden);
    }
    expect(insert).toContain("' (copy)'");
  });

  it("clones media into NEW article-scoped asset rows — never shares asset ids", () => {
    expect(fn).toContain("v_new_asset := gen_random_uuid()");
    expect(fn).toContain("INSERT INTO public.assets");
    expect(fn).toContain("INSERT INTO public.article_assets");
    // New staging key is namespaced to the NEW article and the CLONING user.
    expect(fn).toContain("'staff/' || v_user::text || '/articles/'");
    expect(fn).toContain("v_new.id::text");
    // Clones start pending — verified only after the object copy lands.
    expect(fn).toContain("'pending'");
  });

  it("rewrites document asset references inside the same transaction", () => {
    expect(fn).toContain("jsonb_each_text(v_map)");
    expect(fn).toMatch(/REPLACE\(v_content::text[\s\S]*?::jsonb/);
    expect(fn).toContain("cover_asset_id = v_cover");
  });

  it("returns the copy plan the app layer must execute", () => {
    expect(fn).toContain("'from_key'");
    expect(fn).toContain("'to_key'");
    expect(fn).toMatch(/jsonb_build_object\('article'[\s\S]*?'copies'/);
  });

  it("grants execute to authenticated only (RLS-equivalent gate inside)", () => {
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.duplicate_article(UUID) FROM PUBLIC, anon"
    );
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.duplicate_article(UUID) TO authenticated"
    );
  });
});
