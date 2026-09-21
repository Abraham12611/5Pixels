import { describe, expect, it } from "vitest";
import {
  NEW_BADGE_WINDOW_MS,
  fidelityLabel,
  productBadges,
} from "../badges";

const NOW = Date.parse("2026-09-15T00:00:00Z");

describe("productBadges", () => {
  it("marks products created within the window as new", () => {
    const recent = new Date(NOW - NEW_BADGE_WINDOW_MS / 2).toISOString();
    expect(
      productBadges({ featured_rank: null, created_at: recent }, NOW)
    ).toEqual(["new"]);
  });

  it("does not mark products older than the window as new", () => {
    const old = new Date(NOW - NEW_BADGE_WINDOW_MS * 2).toISOString();
    expect(
      productBadges({ featured_rank: null, created_at: old }, NOW)
    ).toEqual([]);
  });

  it("marks featured products as trending", () => {
    expect(
      productBadges({ featured_rank: 3, created_at: null }, NOW)
    ).toEqual(["trending"]);
  });

  it("can return both badges, new first", () => {
    const recent = new Date(NOW - 1000).toISOString();
    expect(
      productBadges({ featured_rank: 1, created_at: recent }, NOW)
    ).toEqual(["new", "trending"]);
  });

  it("handles missing or future timestamps safely", () => {
    expect(
      productBadges({ featured_rank: null, created_at: null }, NOW)
    ).toEqual([]);
    const future = new Date(NOW + 60_000).toISOString();
    expect(
      productBadges({ featured_rank: null, created_at: future }, NOW)
    ).toEqual([]);
  });
});

describe("fidelityLabel", () => {
  it("maps likeness levels to consumer language", () => {
    expect(fidelityLabel("very_high")).toBe("High fidelity");
    expect(fidelityLabel("high")).toBe("High fidelity");
    expect(fidelityLabel("medium")).toBe("Balanced");
    expect(fidelityLabel("creative")).toBe("Creative");
  });

  it("returns null for unknown or missing levels", () => {
    expect(fidelityLabel(null)).toBeNull();
    expect(fidelityLabel(undefined)).toBeNull();
    expect(fidelityLabel("experimental")).toBeNull();
  });
});
