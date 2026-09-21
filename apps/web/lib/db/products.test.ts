import { describe, expect, it } from "vitest";
import { selectEditableVersion } from "./products";

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
});
