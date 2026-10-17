import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contract test for 20261027000001_article_editorial_blocks.sql (#128) —
 * the public_prompt_recipe column, the anon-safe editorial RPC, and the
 * publish_article extensions validating promptRecipe/settings preset
 * references plus promptRecipe asset references.
 * (Repo checks out SQL as CRLF on Windows — normalize before asserting.)
 */
const sql = readFileSync(
  join(
    __dirname,
    "../../../../../supabase/migrations/20261027000001_article_editorial_blocks.sql"
  ),
  "utf8"
).replace(/\r\n/g, "\n");

describe("article editorial blocks migration", () => {
  it("adds a bounded public_prompt_recipe column", () => {
    expect(sql).toContain("ADD COLUMN public_prompt_recipe TEXT NULL");
    expect(sql).toContain("products_public_prompt_recipe_len");
    // Editorial copy, not a document store.
    expect(sql).toContain("char_length(public_prompt_recipe) <= 8000");
  });

  it("exposes an anon-safe editorial RPC over public products only", () => {
    expect(sql).toContain(
      "CREATE OR REPLACE FUNCTION public.get_public_product_editorial("
    );
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("SET search_path = ''");
    // Only currently-public products resolve.
    expect(sql).toContain("p.visibility = 'public'");
    expect(sql).toContain("p.public_status = 'active'");
    // Only active (publicly documented) controls are returned.
    expect(sql).toContain("f.active = TRUE");
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.get_public_product_editorial(UUID)"
    );
    // The private generation recipe is never selectable.
    expect(sql).not.toContain("private_instruction_template");
  });

  it("requires settings blocks to reference a live public preset", () => {
    expect(sql).toContain(
      "n.node ->> 'type' IN ('preset', 'settings', 'promptRecipe')"
    );
    expect(sql).toContain("'preset', 'settings'");
    expect(sql).toContain("pr.public_status = 'active'");
  });

  it("lets promptRecipe blocks be preset-less but validates a non-empty id", () => {
    expect(sql).toContain("n.node ->> 'type' = 'promptRecipe'");
    expect(sql).toContain("p.preset_id IS NOT NULL");
    expect(sql).toContain("RAISE EXCEPTION 'preset_unavailable'");
  });

  it("rejects forged/malformed promptRecipe asset references without cast errors", () => {
    expect(sql).toContain("RAISE EXCEPTION 'media_ref_not_ready'");
    // The references JSON-string prop is decoded and walked.
    expect(sql).toContain("->> 'references'");
    // Only this article's own verified media may be referenced.
    expect(sql).toContain("aa.article_id = p_article_id");
    expect(sql).toContain("aa.state IN ('ready', 'published')");
    // Malformed JSON surfaces the controlled error, not invalid_text_representation.
    expect(sql).toContain(
      "WHEN invalid_text_representation OR syntax_error THEN"
    );
  });

  it("keeps the publish_article grants intact", () => {
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.publish_article(UUID, BIGINT) TO authenticated"
    );
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.publish_article(UUID, BIGINT) FROM PUBLIC, anon"
    );
  });
});
