import { afterEach, describe, expect, it } from "vitest";

import {
  bachsEnvironment,
  bachsPlanKeyForProductId,
  decimalToCents,
  resolveBachsProductId,
} from "../bachs-client";

const OVERRIDE_ENV = "BACHS_PRODUCT_ID_OVERRIDES";

afterEach(() => {
  delete process.env[OVERRIDE_ENV];
  delete process.env.BACHS_ENVIRONMENT;
});

describe("resolveBachsProductId", () => {
  it("prefers the env override for the plan key", () => {
    process.env[OVERRIDE_ENV] = JSON.stringify({
      "monthly-pro": "prod_live_123",
    });
    expect(
      resolveBachsProductId(
        { bachs_product_id_live: "prod_meta" },
        "monthly-pro"
      )
    ).toBe("prod_live_123");
  });

  it("falls back to env-scoped metadata when no override exists", () => {
    process.env.BACHS_ENVIRONMENT = "sandbox";
    expect(
      resolveBachsProductId(
        {
          bachs_product_id_sandbox: "prod_sandbox",
          bachs_product_id_live: "prod_live",
        },
        "monthly-pro"
      )
    ).toBe("prod_sandbox");
  });

  it("defaults to live metadata outside sandbox", () => {
    process.env.BACHS_ENVIRONMENT = "live";
    expect(
      resolveBachsProductId(
        {
          bachs_product_id_sandbox: "prod_sandbox",
          bachs_product_id_live: "prod_live",
        },
        "monthly-pro"
      )
    ).toBe("prod_live");
  });

  it("falls back to the legacy unscoped product id", () => {
    expect(
      resolveBachsProductId({ bachs_product_id: "prod_legacy" })
    ).toBe("prod_legacy");
  });

  it("returns null when no product id is configured", () => {
    expect(resolveBachsProductId({}, "monthly-pro")).toBeNull();
    expect(resolveBachsProductId(null)).toBeNull();
  });

  it("ignores malformed override JSON and uses metadata", () => {
    process.env[OVERRIDE_ENV] = "{not-json";
    expect(
      resolveBachsProductId(
        { bachs_product_id_live: "prod_live" },
        "monthly-pro"
      )
    ).toBe("prod_live");
  });
});

describe("bachsEnvironment", () => {
  it("is live unless BACHS_ENVIRONMENT=sandbox", () => {
    expect(bachsEnvironment()).toBe("live");
    process.env.BACHS_ENVIRONMENT = "sandbox";
    expect(bachsEnvironment()).toBe("sandbox");
  });
});

describe("bachsPlanKeyForProductId", () => {
  it("returns the plan key whose override matches the product id", () => {
    process.env[OVERRIDE_ENV] = JSON.stringify({
      "monthly-pro": "prod_live_123",
      "weekly-starter": "prod_live_456",
    });
    expect(bachsPlanKeyForProductId("prod_live_456")).toBe("weekly-starter");
  });

  it("returns null when nothing matches or the map is unset", () => {
    expect(bachsPlanKeyForProductId("prod_anything")).toBeNull();
    process.env[OVERRIDE_ENV] = JSON.stringify({ a: "prod_1" });
    expect(bachsPlanKeyForProductId("prod_2")).toBeNull();
  });
});

describe("decimalToCents", () => {
  it("converts Bachs decimal strings to cents", () => {
    expect(decimalToCents("29.00")).toBe(2900);
    expect(decimalToCents("0.99")).toBe(99);
    expect(decimalToCents("75000.00")).toBe(7500000);
  });

  it("returns 0 for missing or malformed amounts", () => {
    expect(decimalToCents(undefined)).toBe(0);
    expect(decimalToCents(null)).toBe(0);
    expect(decimalToCents("not-a-number")).toBe(0);
  });
});
