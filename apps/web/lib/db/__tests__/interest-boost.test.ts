import { describe, expect, it } from "vitest";
import { applyInterestBoost } from "../explore";

function p(id: string, category: string | null) {
  return { id, category_slug: category };
}

describe("applyInterestBoost", () => {
  const catalog = [
    p("a", "analog"),
    p("b", "poster"),
    p("c", "analog"),
    p("d", "cinematic"),
    p("e", "poster"),
  ];

  it("returns input order untouched when no interests", () => {
    expect(applyInterestBoost(catalog, []).map((x) => x.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
  });

  it("surfaces picked categories first, preserving relative order", () => {
    expect(applyInterestBoost(catalog, ["poster"]).map((x) => x.id)).toEqual([
      "b",
      "e",
      "a",
      "c",
      "d",
    ]);
  });

  it("supports multiple picked categories", () => {
    expect(
      applyInterestBoost(catalog, ["cinematic", "analog"]).map((x) => x.id)
    ).toEqual(["a", "c", "d", "b", "e"]);
  });

  it("ignores null category slugs and unknown picks", () => {
    const withNull = [p("x", null), ...catalog];
    expect(applyInterestBoost(withNull, ["nope", "analog"]).map((x) => x.id)).toEqual(
      ["a", "c", "x", "b", "d", "e"]
    );
  });
});
