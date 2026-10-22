import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contract test for 20261025000001_article_preset_publish_check.sql —
 * publish_article must reject preset blocks whose product is not public,
 * or whose version pin no longer points at an active public version.
 * (Repo checks out SQL as CRLF on Windows — normalize before asserting.)
 */
const sql = readFileSync(
  join(
    __dirname,
    "../../../../../supabase/migrations/20261025000001_article_preset_publish_check.sql"
  ),
  "utf8"
).replace(/\r\n/g, "\n");

describe("article preset publish-check migration", () => {
  it("replaces publish_article keeping SECURITY DEFINER + pinned search_path", () => {
    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION public\.publish_article\(/
    );
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("SET search_path = ''");
    expect(sql).toContain("public.is_editorial_staff()");
  });

  it("rejects unconfigured/forged/non-public preset references", () => {
    expect(sql).toContain("RAISE EXCEPTION 'preset_unavailable'");
    // Every `preset` node in the whole document tree is examined.
    expect(sql).toContain("$.**");
    expect(sql).toContain("n.node ->> 'type' = 'preset'");
    // Product must exist AND be public (status + visibility, matching the
    // catalog rules — an active-but-hidden preset cannot publish).
    expect(sql).toContain("pr.public_status = 'active'");
    expect(sql).toContain("pr.visibility = 'public'");
    // Non-uuid text is validated before the cast — no cast error leak.
    expect(sql).toMatch(
      /preset_id !~ '\^\[0-9a-fA-F\]\{8\}/
    );
  });

  it("rejects version pins that are not the product's active version", () => {
    expect(sql).toContain(
      "RAISE EXCEPTION 'preset_version_unavailable'"
    );
    expect(sql).toContain("pv.state = 'active'");
    // The pin must belong to the same product the block references.
    expect(sql).toContain("pv.product_id = (n.node -> 'props' ->> 'presetId')::uuid");
  });

  it("keeps the media-integrity checks and grants intact", () => {
    expect(sql).toContain("RAISE EXCEPTION 'media_ref_not_ready'");
    expect(sql).toContain("RAISE EXCEPTION 'media_not_promoted'");
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.publish_article(UUID, BIGINT) TO authenticated"
    );
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.publish_article(UUID, BIGINT) FROM PUBLIC, anon"
    );
  });
});
