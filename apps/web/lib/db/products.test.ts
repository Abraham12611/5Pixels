import { describe, expect, it } from "vitest";
import {
  selectEditableVersionSync as selectEditableVersion,
  selectLiveVersion,
  selectStaleVersions,
  stalePublishConflict,
} from "@/lib/admin/version-selection";

describe("selectEditableVersion", () => {
  it("selects the current draft when present", async () => {
    const versions = [
      { id: "active-1", state: "active", version_number: 1 },
      { id: "draft-2", state: "draft", version_number: 2 },
      { id: "retired-0", state: "retired", version_number: 0 },
    ];
    const result = await selectEditableVersion(versions);
    expect(result?.id).toBe("draft-2");
  });

  it("falls back to testing when no draft exists", async () => {
    const versions = [
      { id: "active-1", state: "active", version_number: 1 },
      { id: "testing-2", state: "testing", version_number: 2 },
    ];
    const result = await selectEditableVersion(versions);
    expect(result?.id).toBe("testing-2");
  });

  it("falls back to active when no draft or testing exists", async () => {
    const versions = [
      { id: "retired-0", state: "retired", version_number: 0 },
      { id: "active-1", state: "active", version_number: 1 },
    ];
    const result = await selectEditableVersion(versions);
    expect(result?.id).toBe("active-1");
  });

  it("picks the highest-numbered draft when multiple drafts exist", async () => {
    const versions = [
      { id: "draft-1", state: "draft", version_number: 1 },
      { id: "draft-3", state: "draft", version_number: 3 },
      { id: "draft-2", state: "draft", version_number: 2 },
    ];
    const result = await selectEditableVersion(versions);
    expect(result?.id).toBe("draft-3");
  });

  it("returns null for an empty list", async () => {
    expect(await selectEditableVersion([])).toBeNull();
  });

  // #251 — Retro Slam Manga incident: a stale draft must never masquerade as
  // the live recipe.
  it("selects active v5 over a stale draft v4", async () => {
    const versions = [
      { id: "draft-4", state: "draft", version_number: 4 },
      { id: "active-5", state: "active", version_number: 5 },
    ];
    const result = await selectEditableVersion(versions);
    expect(result?.id).toBe("active-5");
  });

  it("selects a newer draft v6 over active v5", async () => {
    const versions = [
      { id: "active-5", state: "active", version_number: 5 },
      { id: "draft-6", state: "draft", version_number: 6 },
    ];
    const result = await selectEditableVersion(versions);
    expect(result?.id).toBe("draft-6");
  });

  it("selects active over a stale testing version", async () => {
    const versions = [
      { id: "testing-4", state: "testing", version_number: 4 },
      { id: "active-5", state: "active", version_number: 5 },
    ];
    const result = await selectEditableVersion(versions);
    expect(result?.id).toBe("active-5");
  });

  it("selects the newest draft even when a stale draft also exists", async () => {
    const versions = [
      { id: "draft-4", state: "draft", version_number: 4 },
      { id: "active-5", state: "active", version_number: 5 },
      { id: "draft-7", state: "draft", version_number: 7 },
    ];
    const result = await selectEditableVersion(versions);
    expect(result?.id).toBe("draft-7");
  });

  it("selects the draft for a draft-only product", async () => {
    const versions = [{ id: "draft-1", state: "draft", version_number: 1 }];
    const result = await selectEditableVersion(versions);
    expect(result?.id).toBe("draft-1");
  });

  it("ignores retired versions while a newer editable or live version exists", async () => {
    const versions = [
      { id: "retired-9", state: "retired", version_number: 9 },
      { id: "active-5", state: "active", version_number: 5 },
    ];
    const result = await selectEditableVersion(versions);
    expect(result?.id).toBe("active-5");
  });
});

describe("selectStaleVersions (#251)", () => {
  it("flags drafts numbered below the live version", () => {
    const versions = [
      { id: "draft-4", state: "draft", version_number: 4 },
      { id: "active-5", state: "active", version_number: 5 },
    ];
    const stale = selectStaleVersions(versions).map((v) => v.id);
    expect(stale).toEqual(["draft-4"]);
  });

  it("flags stale testing versions too", () => {
    const versions = [
      { id: "testing-3", state: "testing", version_number: 3 },
      { id: "active-5", state: "active", version_number: 5 },
    ];
    expect(selectStaleVersions(versions).map((v) => v.id)).toEqual([
      "testing-3",
    ]);
  });

  it("does not flag a newer draft over the live version", () => {
    const versions = [
      { id: "active-5", state: "active", version_number: 5 },
      { id: "draft-6", state: "draft", version_number: 6 },
    ];
    expect(selectStaleVersions(versions)).toEqual([]);
  });

  it("returns none for a draft-only product with no live version", () => {
    const versions = [
      { id: "draft-1", state: "draft", version_number: 1 },
      { id: "draft-2", state: "draft", version_number: 2 },
    ];
    expect(selectStaleVersions(versions)).toEqual([]);
  });

  it("does not flag the live version itself", () => {
    const versions = [{ id: "active-5", state: "active", version_number: 5 }];
    expect(selectStaleVersions(versions)).toEqual([]);
    expect(selectLiveVersion(versions)?.id).toBe("active-5");
  });
});

describe("stalePublishConflict (#251)", () => {
  const versions = [
    { id: "draft-4", state: "draft", version_number: 4 },
    { id: "active-5", state: "active", version_number: 5 },
    { id: "draft-6", state: "draft", version_number: 6 },
  ];

  it("blocks a stale draft from publishing over the live version", () => {
    const message = stalePublishConflict(versions[0], versions);
    expect(message).toMatch(/v4 is older than the live v5/);
  });

  it("allows a newer draft over the live version", () => {
    expect(stalePublishConflict(versions[2], versions)).toBeNull();
  });

  it("allows any draft when nothing is live yet", () => {
    const draftOnly = [
      { id: "draft-1", state: "draft", version_number: 1 },
      { id: "draft-2", state: "draft", version_number: 2 },
    ];
    expect(stalePublishConflict(draftOnly[0], draftOnly)).toBeNull();
  });
});
