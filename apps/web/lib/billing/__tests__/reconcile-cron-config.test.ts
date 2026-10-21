import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contract test for issue #103 — the billing reconciliation cron is a
 * financial circuit breaker and must run sub-daily in the deployed
 * config, while its fail-loud auth/error contract must not soften.
 * The route unit tests mock the reconciler, so these assertions guard
 * the config layer mocks can't see.
 */
const vercelJson = JSON.parse(
  readFileSync(join(__dirname, "../../../vercel.json"), "utf-8")
) as { crons: { path: string; schedule: string }[] };

const routeSrc = readFileSync(
  join(__dirname, "../../../app/api/cron/billing-reconcile/route.ts"),
  "utf-8"
);

function cronFor(path: string) {
  const cron = vercelJson.crons.find((c) => c.path === path);
  if (!cron) throw new Error(`no cron registered for ${path}`);
  return cron;
}

describe("billing-reconcile cron cadence (#103)", () => {
  it("runs sub-daily — the hour field is not pinned to one hour", () => {
    const fields = cronFor("/api/cron/billing-reconcile").schedule.split(/\s+/);
    expect(fields).toHaveLength(5);
    // "N * * * *" (hourly) or "N */H * * *" (every H hours) — anything
    // where the hour field doesn't fix a single hour of day.
    expect(fields[1] === "*" || fields[1].includes("/")).toBe(true);
  });

  it("does not disturb the other crons' cadence", () => {
    // credit-drip stays daily (#83 owns it); referral hold stays daily.
    expect(cronFor("/api/cron/credit-drip").schedule).toBe("0 0 * * *");
    expect(cronFor("/api/cron/referral-hold-release").schedule).toBe(
      "30 0 * * *"
    );
  });
});

describe("cron registry coverage (#112)", () => {
  it("every app/api/cron/*/route.ts has a registered schedule in vercel.json", () => {
    // teaser-sweep shipped its route without a schedule entry — expired
    // pending generations were never swept in production. Guard the
    // route→schedule pairing so new crons can't silently go unscheduled.
    const cronDir = join(__dirname, "../../../app/api/cron");
    const routes = readdirSync(cronDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => `/api/cron/${d.name}`)
      .sort();
    expect(routes.length).toBeGreaterThan(0);
    for (const path of routes) {
      expect(
        vercelJson.crons.map((c) => c.path),
        `${path} route exists but has no vercel.json schedule`
      ).toContain(path);
    }
  });
});

describe("billing-reconcile route — fail-loud contract", () => {
  it("refuses to run without CRON_SECRET configured", () => {
    // Missing secret → 500, and this check must precede the auth check.
    const missing = routeSrc.indexOf("Not configured");
    const unauthorized = routeSrc.indexOf("Unauthorized");
    expect(missing).toBeGreaterThan(-1);
    expect(unauthorized).toBeGreaterThan(-1);
    expect(missing).toBeLessThan(unauthorized);
  });

  it("authenticates with Bearer $CRON_SECRET and 500s on run failure", () => {
    expect(routeSrc).toContain("Bearer ${secret}");
    expect(routeSrc).toContain("status: 401");
    expect(routeSrc).toContain("runBillingReconciliation");
    // Run failure surfaces as a 500 — never a quiet 200.
    expect(routeSrc).toMatch(/status:\s*500/);
  });
});
