import { describe, expect, it } from "vitest";
import {
  HIGH_COST_THRESHOLD,
  shouldConfirmCost,
} from "@/lib/generation/credit-confirm";

describe("shouldConfirmCost", () => {
  it("confirms the first paid generation", () => {
    expect(
      shouldConfirmCost({
        cost: 3,
        hasPriorGenerations: false,
        skipPreference: false,
      })
    ).toBe(true);
  });

  it("does not confirm for a returning user at standard cost", () => {
    expect(
      shouldConfirmCost({
        cost: 3,
        hasPriorGenerations: true,
        skipPreference: false,
      })
    ).toBe(false);
  });

  it("re-asks for unusually costly transformations", () => {
    expect(
      shouldConfirmCost({
        cost: HIGH_COST_THRESHOLD,
        hasPriorGenerations: true,
        skipPreference: false,
      })
    ).toBe(true);
    expect(
      shouldConfirmCost({
        cost: HIGH_COST_THRESHOLD - 1,
        hasPriorGenerations: true,
        skipPreference: false,
      })
    ).toBe(false);
  });

  it("honors the don't-ask-again preference", () => {
    expect(
      shouldConfirmCost({
        cost: 3,
        hasPriorGenerations: false,
        skipPreference: true,
      })
    ).toBe(false);
    expect(
      shouldConfirmCost({
        cost: HIGH_COST_THRESHOLD,
        hasPriorGenerations: true,
        skipPreference: true,
      })
    ).toBe(false);
  });

  it("never confirms free transformations", () => {
    expect(
      shouldConfirmCost({
        cost: 0,
        hasPriorGenerations: false,
        skipPreference: false,
      })
    ).toBe(false);
  });
});
