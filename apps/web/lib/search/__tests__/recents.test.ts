// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  getRecentPresets,
  RECENT_PRESETS_KEY,
  recordRecentPreset,
} from "@/lib/search/recents";

describe("recents", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns an empty list when nothing is stored", () => {
    expect(getRecentPresets()).toEqual([]);
  });

  it("records presets most-recent first and dedupes by slug", () => {
    recordRecentPreset({ slug: "a", name: "Alpha", thumbUrl: null });
    recordRecentPreset({ slug: "b", name: "Beta", thumbUrl: null });
    recordRecentPreset({ slug: "a", name: "Alpha", thumbUrl: null });

    expect(getRecentPresets().map((r) => r.slug)).toEqual(["a", "b"]);
  });

  it("caps the list at six entries", () => {
    for (const slug of ["1", "2", "3", "4", "5", "6", "7"]) {
      recordRecentPreset({ slug, name: slug, thumbUrl: null });
    }
    const recents = getRecentPresets();
    expect(recents).toHaveLength(6);
    expect(recents[0].slug).toBe("7");
    expect(recents.map((r) => r.slug)).not.toContain("1");
  });

  it("returns an empty list on malformed storage", () => {
    window.localStorage.setItem(RECENT_PRESETS_KEY, "not-json{{{");
    expect(getRecentPresets()).toEqual([]);
  });

  it("filters out entries without slug/name", () => {
    window.localStorage.setItem(
      RECENT_PRESETS_KEY,
      JSON.stringify([{ slug: "ok", name: "OK", thumbUrl: null }, { nope: 1 }])
    );
    expect(getRecentPresets()).toEqual([
      { slug: "ok", name: "OK", thumbUrl: null },
    ]);
  });
});
