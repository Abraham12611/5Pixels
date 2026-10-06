import { afterEach, describe, expect, it } from "vitest";

import {
  resolveWhopVariantId,
  whopEnvironment,
  whopPlanKeyForVariantId,
} from "../whop-client";

const OVERRIDE_ENV = "WHOP_VARIANT_ID_OVERRIDES";

afterEach(() => {
  delete process.env[OVERRIDE_ENV];
  delete process.env.WHOP_ENVIRONMENT;
});

describe("resolveWhopVariantId", () => {
  it("prefers the env override for the plan key", () => {
    process.env[OVERRIDE_ENV] = JSON.stringify({
      "monthly-pro": "plan_live_123",
    });
    expect(
      resolveWhopVariantId(
        { whop_variant_id_live: "plan_meta" },
        "monthly-pro"
      )
    ).toBe("plan_live_123");
  });

  it("falls back to env-scoped metadata when no override exists", () => {
    process.env.WHOP_ENVIRONMENT = "sandbox";
    expect(
      resolveWhopVariantId(
        {
          whop_variant_id_sandbox: "plan_sandbox",
          whop_variant_id_live: "plan_live",
        },
        "monthly-pro"
      )
    ).toBe("plan_sandbox");
  });

  it("defaults to live metadata outside sandbox", () => {
    process.env.WHOP_ENVIRONMENT = "live";
    expect(
      resolveWhopVariantId(
        {
          whop_variant_id_sandbox: "plan_sandbox",
          whop_variant_id_live: "plan_live",
        },
        "monthly-pro"
      )
    ).toBe("plan_live");
  });

  it("falls back to the legacy unscoped variant id", () => {
    expect(
      resolveWhopVariantId({ whop_variant_id: "plan_legacy" })
    ).toBe("plan_legacy");
  });

  it("returns null when no variant id is configured", () => {
    expect(resolveWhopVariantId({}, "monthly-pro")).toBeNull();
    expect(resolveWhopVariantId(null)).toBeNull();
  });

  it("ignores malformed override JSON and uses metadata", () => {
    process.env[OVERRIDE_ENV] = "{not-json";
    expect(
      resolveWhopVariantId(
        { whop_variant_id_live: "plan_live" },
        "monthly-pro"
      )
    ).toBe("plan_live");
  });
});

describe("whopEnvironment", () => {
  it("is live unless WHOP_ENVIRONMENT=sandbox", () => {
    expect(whopEnvironment()).toBe("live");
    process.env.WHOP_ENVIRONMENT = "sandbox";
    expect(whopEnvironment()).toBe("sandbox");
  });
});

describe("whopPlanKeyForVariantId", () => {
  it("returns the plan key whose override matches the variant id", () => {
    process.env[OVERRIDE_ENV] = JSON.stringify({
      "monthly-pro": "plan_live_123",
      "weekly-starter": "plan_live_456",
    });
    expect(whopPlanKeyForVariantId("plan_live_456")).toBe("weekly-starter");
  });

  it("returns null when nothing matches or the map is unset", () => {
    expect(whopPlanKeyForVariantId("plan_anything")).toBeNull();
    process.env[OVERRIDE_ENV] = JSON.stringify({ a: "plan_1" });
    expect(whopPlanKeyForVariantId("plan_2")).toBeNull();
  });
});
