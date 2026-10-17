import { describe, expect, it } from "vitest";
import { readingMinutes, WORDS_PER_MINUTE } from "../reading-time";

describe("readingMinutes", () => {
  it("returns 1 for empty or invalid counts", () => {
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(-5)).toBe(1);
    expect(readingMinutes(Number.NaN)).toBe(1);
    expect(readingMinutes(Number.POSITIVE_INFINITY)).toBe(1);
  });

  it("rounds small counts to 1 minute", () => {
    expect(readingMinutes(10)).toBe(1);
    expect(readingMinutes(WORDS_PER_MINUTE / 2)).toBe(1);
  });

  it("rounds to the nearest minute", () => {
    expect(readingMinutes(WORDS_PER_MINUTE)).toBe(1);
    expect(readingMinutes(WORDS_PER_MINUTE * 2.4)).toBe(2);
    expect(readingMinutes(WORDS_PER_MINUTE * 2.6)).toBe(3);
    expect(readingMinutes(1234)).toBe(6);
  });
});
