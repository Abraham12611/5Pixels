import { describe, expect, it } from "vitest";
import { quoteFingerprintKey } from "../quote-fingerprint";
import type { OutputSizeOption } from "@/types/catalog";

const SIZE: OutputSizeOption = {
  name: "Square (1:1)",
  width: 1024,
  height: 1024,
};

function key(overrides: Partial<Parameters<typeof quoteFingerprintKey>[0]> = {}) {
  return quoteFingerprintKey({
    productVersionId: "ver-1",
    outputSize: SIZE,
    ...overrides,
  });
}

describe("quoteFingerprintKey", () => {
  it("is stable for identical inputs", () => {
    expect(key()).toBe(key());
    expect(
      key({ inputs: [{ id: "a1", role: "person" }] })
    ).toBe(key({ inputs: [{ id: "a1", role: "person" }] }));
  });

  it("changes when an input is added or substituted", () => {
    const one = key({ inputs: [{ id: "a1", role: null }] });
    const two = key({
      inputs: [
        { id: "a1", role: null },
        { id: "a2", role: null },
      ],
    });
    const swapped = key({ inputs: [{ id: "a3", role: null }] });
    expect(two).not.toBe(one);
    expect(swapped).not.toBe(one);
  });

  it("treats ordinal order and roles as cost-bearing — swaps reprice", () => {
    const subjectFirst = key({
      inputs: [
        { id: "a1", role: "person" },
        { id: "a2", role: "outfit" },
      ],
    });
    const outfitFirst = key({
      inputs: [
        { id: "a2", role: "outfit" },
        { id: "a1", role: "person" },
      ],
    });
    const relabeled = key({
      inputs: [
        { id: "a1", role: "outfit" },
        { id: "a2", role: "person" },
      ],
    });
    expect(outfitFirst).not.toBe(subjectFirst);
    expect(relabeled).not.toBe(subjectFirst);
  });

  it("changes when a pending local pick resolves to an asset id", () => {
    const pending = key({ inputs: [{ id: "local:p.png:10", role: null }] });
    const uploaded = key({ inputs: [{ id: "asset-9", role: null }] });
    expect(uploaded).not.toBe(pending);
  });

  it("changes on prompt and pending-dims signals", () => {
    expect(key({ prompt: "warmer tones" })).not.toBe(key());
    expect(key({ prompt: "warmer tones" })).not.toBe(
      key({ prompt: "cooler tones" })
    );
    expect(key({ sourceDimsPending: true })).not.toBe(key());
  });
});
