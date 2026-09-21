import { describe, expect, it } from "vitest";
import {
  PRESET_MEDIA_MAX_BYTES,
  buildPresetMediaPath,
  validateAdminUpload,
  validateOwnedPresetMediaPath,
} from "./admin-assets";

const userId = "29f87d4c-11bc-4f31-8aa8-c7fe86ca17dd";
const uploadId = "77bd0d44-6be1-4a65-aeaa-b50d98fa2671";

describe("admin asset upload validation", () => {
  it("accepts supported media for its role", () => {
    expect(
      validateAdminUpload("preview-video", {
        name: "clip.mp4",
        type: "video/mp4",
        size: 1024,
      })
    ).toBe("preview-video");
  });

  it("rejects mismatched MIME types and oversized files", () => {
    expect(() =>
      validateAdminUpload("hero", {
        name: "clip.mp4",
        type: "video/mp4",
        size: 1024,
      })
    ).toThrow("Unsupported file type");
    expect(() =>
      validateAdminUpload("poster", {
        name: "poster.png",
        type: "image/png",
        size: PRESET_MEDIA_MAX_BYTES + 1,
      })
    ).toThrow("25 MB");
  });

  it("builds randomized extension-safe paths", () => {
    expect(
      buildPresetMediaPath(userId, "preview-gif", uploadId, "image/gif")
    ).toBe(`admins/${userId}/preview-gif/${uploadId}.gif`);
  });

  it("rejects paths outside the current admin and role", () => {
    const validPath = `admins/${userId}/hero/${uploadId}.webp`;
    expect(validateOwnedPresetMediaPath(userId, "hero", validPath)).toBe(
      validPath
    );
    expect(() =>
      validateOwnedPresetMediaPath(userId, "poster", validPath)
    ).toThrow("Invalid upload path");
    expect(() =>
      validateOwnedPresetMediaPath(
        userId,
        "hero",
        `admins/other/hero/${uploadId}.webp`
      )
    ).toThrow("Invalid upload path");
  });
});
