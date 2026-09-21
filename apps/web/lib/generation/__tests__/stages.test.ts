import { describe, expect, it } from "vitest";
import {
  GENERATION_STAGES,
  isFailureStatus,
  isTerminalStatus,
  pixelCountForStatus,
  stageForStatus,
  stageIndexForStatus,
  statusCopy,
} from "../stages";

describe("isTerminalStatus", () => {
  it("marks completed/failed/blocked/cancelled terminal", () => {
    for (const s of ["completed", "failed", "blocked", "cancelled"]) {
      expect(isTerminalStatus(s)).toBe(true);
    }
  });
  it("marks active statuses non-terminal", () => {
    for (const s of [
      "created",
      "uploaded",
      "validating",
      "queued",
      "generating",
      "post_processing",
    ]) {
      expect(isTerminalStatus(s)).toBe(false);
    }
  });
});

describe("stageForStatus", () => {
  it("groups early statuses into preparing", () => {
    for (const s of ["created", "uploaded", "validating"]) {
      expect(stageForStatus(s)?.id).toBe("preparing");
    }
  });
  it("maps each active status to its stage", () => {
    expect(stageForStatus("queued")?.id).toBe("queued");
    expect(stageForStatus("generating")?.id).toBe("generating");
    expect(stageForStatus("post_processing")?.id).toBe("finishing");
  });
  it("returns null for terminal statuses", () => {
    expect(stageForStatus("completed")).toBeNull();
    expect(stageForStatus("failed")).toBeNull();
  });
  it("falls back to preparing for unknown statuses", () => {
    expect(stageForStatus("some_future_status")?.id).toBe("preparing");
  });
});

describe("stageIndexForStatus", () => {
  it("returns ordered indexes for active statuses", () => {
    expect(stageIndexForStatus("created")).toBe(0);
    expect(stageIndexForStatus("queued")).toBe(1);
    expect(stageIndexForStatus("generating")).toBe(2);
    expect(stageIndexForStatus("post_processing")).toBe(3);
  });
  it("returns -1 for terminal statuses", () => {
    expect(stageIndexForStatus("completed")).toBe(-1);
    expect(stageIndexForStatus("cancelled")).toBe(-1);
  });
});

describe("pixelCountForStatus", () => {
  it("lights stageIndex+1 pixels while running", () => {
    expect(pixelCountForStatus("created")).toBe(1);
    expect(pixelCountForStatus("queued")).toBe(2);
    expect(pixelCountForStatus("generating")).toBe(3);
    expect(pixelCountForStatus("post_processing")).toBe(4);
  });
  it("lights all five on completion", () => {
    expect(pixelCountForStatus("completed")).toBe(5);
  });
  it("lights none on failure", () => {
    expect(pixelCountForStatus("failed")).toBe(0);
    expect(pixelCountForStatus("blocked")).toBe(0);
    expect(pixelCountForStatus("cancelled")).toBe(0);
  });
});

describe("isFailureStatus", () => {
  it("treats failed/blocked/cancelled as failures", () => {
    expect(isFailureStatus("failed")).toBe(true);
    expect(isFailureStatus("blocked")).toBe(true);
    expect(isFailureStatus("cancelled")).toBe(true);
    expect(isFailureStatus("completed")).toBe(false);
    expect(isFailureStatus("generating")).toBe(false);
  });
});

describe("statusCopy", () => {
  it("communicates credit return on failure", () => {
    const copy = statusCopy("failed");
    expect(copy.credit).toMatch(/credits were returned/i);
  });
  it("says no charge for blocked and cancelled", () => {
    expect(statusCopy("blocked").credit).toMatch(/no credits were charged/i);
    expect(statusCopy("cancelled").credit).toMatch(/no credits were charged/i);
  });
  it("prefers statusDetail when present on failure", () => {
    expect(statusCopy("failed", "Custom reason").body).toBe("Custom reason");
  });
  it("uses stage labels for active statuses", () => {
    expect(statusCopy("generating").title).toBe(
      GENERATION_STAGES[2]!.label
    );
  });
  it("signals readiness on completion", () => {
    expect(statusCopy("completed").title).toMatch(/ready/i);
  });
  it("never leaks provider/inference terminology", () => {
    for (const s of [
      "created",
      "uploaded",
      "validating",
      "queued",
      "generating",
      "post_processing",
      "completed",
      "failed",
      "blocked",
      "cancelled",
      "mystery_status",
    ]) {
      const copy = statusCopy(s);
      const text = `${copy.title} ${copy.body} ${copy.credit ?? ""}`;
      expect(text).not.toMatch(
        /prompt|inference|provider|model|seed|scheduler|lora|checkpoint/i
      );
    }
  });
});
