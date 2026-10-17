import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contract test for the hosted-drift forward-ports — two hardening changes
 * that existed only on the hosted project (recorded there as
 * 20261023000001/2) and must survive fresh environments. The repo files
 * mirror the verified live definitions.
 * (Repo checks out SQL as CRLF on Windows — normalize before asserting.)
 */
function migration(name: string): string {
  return readFileSync(
    join(__dirname, "../../../../../supabase/migrations", name),
    "utf8"
  ).replace(/\r\n/g, "\n");
}

describe("hosted drift convergence migrations", () => {
  it("get_active_plan_id requires the caller to be the subject or service role", () => {
    const sql = migration(
      "20261028000001_get_active_plan_id_caller_check.sql"
    );
    expect(sql).toContain(
      "CREATE OR REPLACE FUNCTION public.get_active_plan_id(p_user_id UUID)"
    );
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("SET search_path = ''");
    // The caller check itself.
    expect(sql).toContain("(SELECT auth.uid()) IS DISTINCT FROM p_user_id");
    expect(sql).toContain("'service_role'");
    expect(sql).toContain("'42501'");
  });

  it("set_profile_referral_code pins search_path like other definer functions", () => {
    const sql = migration(
      "20261028000002_referral_trigger_search_path.sql"
    );
    expect(sql).toContain(
      "CREATE OR REPLACE FUNCTION public.set_profile_referral_code()"
    );
    expect(sql).toContain("SET search_path = ''");
    // Still qualifies the nested call explicitly.
    expect(sql).toContain("public.generate_referral_code()");
  });
});
