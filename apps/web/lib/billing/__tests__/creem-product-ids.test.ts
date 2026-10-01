import { afterEach, describe, expect, it } from "vitest";

import {
  creemPlanKeyForProductId,
  resolveCreemProductId,
} from "../creem-client";

const OVERRIDE_ENV = "CREEM_PRODUCT_ID_OVERRIDES";

afterEach(() => {
  delete process.env[OVERRIDE_ENV];
});

describe("resolveCreemProductId", () => {
  it("prefers the env override for the plan key", () => {
    process.env[OVERRIDE_ENV] = JSON.stringify({
      "pro-monthly": "prod_live_123",
    });
    expect(
      resolveCreemProductId(
        { creem_product_id_live: "prod_meta" },
        "pro-monthly"
      )
    ).toBe("prod_live_123");
  });

  it("falls back to env-scoped metadata when no override exists", () => {
    process.env.CREEM_API_KEY = "creem_test_key";
    expect(
      resolveCreemProductId(
        {
          creem_product_id_test: "prod_test",
          creem_product_id_live: "prod_live",
        },
        "pro-monthly"
      )
    ).toBe("prod_test");
  });

  it("falls back to metadata when the override map has no entry for the plan", () => {
    process.env.CREEM_API_KEY = "creem_live_key";
    process.env[OVERRIDE_ENV] = JSON.stringify({ "other-plan": "prod_x" });
    expect(
      resolveCreemProductId(
        { creem_product_id_live: "prod_live" },
        "pro-monthly"
      )
    ).toBe("prod_live");
  });

  it("falls back to the legacy unscoped product id", () => {
    expect(
      resolveCreemProductId({ creem_product_id: "prod_legacy" })
    ).toBe("prod_legacy");
  });

  it("ignores malformed override JSON and uses metadata", () => {
    process.env.CREEM_API_KEY = "creem_live_key";
    process.env[OVERRIDE_ENV] = "{not-json";
    expect(
      resolveCreemProductId(
        { creem_product_id_live: "prod_live" },
        "pro-monthly"
      )
    ).toBe("prod_live");
  });
});

describe("creemPlanKeyForProductId", () => {
  it("returns the plan key whose override matches the product id", () => {
    process.env[OVERRIDE_ENV] = JSON.stringify({
      "pro-monthly": "prod_live_123",
      "weekly-starter": "prod_live_456",
    });
    expect(creemPlanKeyForProductId("prod_live_456")).toBe("weekly-starter");
  });

  it("returns null when nothing matches or the map is unset", () => {
    expect(creemPlanKeyForProductId("prod_anything")).toBeNull();
    process.env[OVERRIDE_ENV] = JSON.stringify({ a: "prod_1" });
    expect(creemPlanKeyForProductId("prod_2")).toBeNull();
  });
});
