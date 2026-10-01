import { describe, expect, it } from "vitest";
import {
  formatReferralCode,
  isReferralCode,
  normalizeReferralCode,
} from "../codes";

describe("normalizeReferralCode", () => {
  it("strips the display hyphen and uppercases", () => {
    expect(normalizeReferralCode("k7m-2qx")).toBe("K7M2QX");
    expect(normalizeReferralCode("K7M2QX")).toBe("K7M2QX");
    expect(normalizeReferralCode("K7M-2QX")).toBe("K7M2QX");
  });

  it("tolerates spaces and other cosmetic separators", () => {
    expect(normalizeReferralCode(" k7m 2qx ")).toBe("K7M2QX");
    expect(normalizeReferralCode("k7m_2qx")).toBe("K7M2QX");
  });

  it("strips non-alphanumerics entirely", () => {
    expect(normalizeReferralCode("K7M-2QX!")).toBe("K7M2QX");
  });
});

describe("isReferralCode / CODE_RE", () => {
  it("accepts 6 alphanumerics in any case or grouping", () => {
    expect(isReferralCode("K7M2QX")).toBe(true);
    expect(isReferralCode("k7m-2qx")).toBe(true);
    expect(isReferralCode("AB 12 CD")).toBe(true);
  });

  it("rejects wrong lengths", () => {
    expect(isReferralCode("K7M2Q")).toBe(false);
    expect(isReferralCode("K7M2QXA")).toBe(false);
    expect(isReferralCode("")).toBe(false);
  });
});

describe("formatReferralCode", () => {
  it("groups 6 chars as XXX-XXX", () => {
    expect(formatReferralCode("K7M2QX")).toBe("K7M-2QX");
    expect(formatReferralCode("k7m2qx")).toBe("K7M-2QX");
    expect(formatReferralCode("K7M-2QX")).toBe("K7M-2QX");
  });

  it("passes through input that isn't a valid code", () => {
    expect(formatReferralCode("nope")).toBe("nope");
  });
});
