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
    // Catalog visibility rules — an active-but-hidden preset cannot publish.
    expect(sql).toContain("pr.visibility = 'public'");
  });

  it("lets promptRecipe blocks be preset-less but validates a non-empty id", () => {
    expect(sql).toContain("n.node ->> 'type' = 'promptRecipe'");
    expect(sql).toContain("p.preset_id IS NOT NULL");
    expect(sql).toContain("RAISE EXCEPTION 'preset_unavailable'");
  });

  it("extends the shared asset collector to promptRecipe references", () => {
    expect(sql).toContain(
      "CREATE OR REPLACE FUNCTION public.article_document_asset_ids(p_content JSONB)"
    );
    // 'asset'-kind prompt-recipe references join the same collection —
    // publish promotion + live-publication delete protection follow for free.
    expect(sql).toContain("r.val ->> 'kind' = 'asset'");
    // The collector must not crash on a malformed serialized prop.
    expect(sql).toContain("LANGUAGE plpgsql");
  });

  it("rejects forged/malformed promptRecipe references without cast errors", () => {
    expect(sql).toContain("RAISE EXCEPTION 'media_ref_not_ready'");
    // The references JSON-string prop is decoded and walked.
    expect(sql).toContain("->> 'references'");
    // Element shape is validated semantically, not just syntactically.
    expect(sql).toContain("(ref.ref ->> 'kind') NOT IN ('asset', 'generation')");
    // Only this article's own verified media may be referenced.
    expect(sql).toContain("aa.article_id = p_article_id");
    expect(sql).toContain("aa.state IN ('ready', 'published')");
    // Generation refs must resolve to a currently publicly-shared result.
    expect(sql).toContain("g.public_share_id IS NOT NULL");
    // Malformed JSON surfaces the controlled error, not invalid_text_representation.
    expect(sql).toContain(
      "WHEN invalid_text_representation OR syntax_error THEN"
    );
  });

  it("validates settings rows against the live public control schema", () => {
    expect(sql).toContain("RAISE EXCEPTION 'settings_fields_invalid'");
    // Rows decode from the serialized `fields` prop and join the preset's
    // active product_fields — keys and values are checked server-side.
    expect(sql).toContain("->> 'fields'");
    expect(sql).toContain("f.product_id = p.preset_id::uuid");
    expect(sql).toContain("f.field_key = row.row ->> 'key'");
    expect(sql).toContain("f.active = TRUE");
    // Value semantics match the editor's settingsValueError rules.
    expect(sql).toContain("'select','radio','layout','background','wardrobe','era','mood'");
    expect(sql).toContain("f.field_type = 'intensity'");
    expect(sql).toContain("f.field_type = 'toggle'");
    expect(sql).toContain("f.field_type = 'color'");
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
