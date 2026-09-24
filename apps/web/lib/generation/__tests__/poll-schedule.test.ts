import { describe, expect, it } from "vitest";
import { pollIntervalMs } from "../poll-schedule";

describe("pollIntervalMs", () => {
  it("polls every 4s while the run is fresh", () => {
    expect(pollIntervalMs(0)).toBe(4_000);
    expect(pollIntervalMs(59_999)).toBe(4_000);
  });

  it("backs off to 8s after a minute", () => {
    expect(pollIntervalMs(60_000)).toBe(8_000);
    expect(pollIntervalMs(179_999)).toBe(8_000);
  });

  it("backs off to 15s after three minutes", () => {
    expect(pollIntervalMs(180_000)).toBe(15_000);
    expect(pollIntervalMs(10 * 60_000)).toBe(15_000);
  });
});
