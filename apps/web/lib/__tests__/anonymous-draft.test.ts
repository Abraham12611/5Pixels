import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearStudioDraft,
  loadStudioDraft,
  saveStudioDraft,
} from "../anonymous-draft";

/**
 * Minimal in-memory IndexedDB — just the surface anonymous-draft uses:
 * open → objectStore(get/put/delete) inside a transaction that completes
 * asynchronously.
 */
function makeFakeIndexedDB() {
  const data = new Map<string, unknown>();
  const makeDb = () => ({
    objectStoreNames: { contains: () => true },
    transaction: () => {
      const tx: Record<string, unknown> = {};
      tx.objectStore = () => ({
        get: (key: string) => {
          const request: Record<string, unknown> = {};
          queueMicrotask(() => {
            request.result = data.get(key);
            (request.onsuccess as (() => void) | undefined)?.();
          });
          return request;
        },
        put: (value: unknown, key: string) => {
          data.set(key, value);
        },
        delete: (key: string) => {
          data.delete(key);
        },
      });
      queueMicrotask(() => {
        queueMicrotask(() => (tx.oncomplete as (() => void) | undefined)?.());
      });
      return tx;
    },
    close: () => {},
  });
  return {
    data,
    open: () => {
      const request: Record<string, unknown> = {};
      queueMicrotask(() => {
        request.result = makeDb();
        (request.onsuccess as (() => void) | undefined)?.();
      });
      return request;
    },
  };
}

let fakeDb: ReturnType<typeof makeFakeIndexedDB>;

beforeEach(() => {
  fakeDb = makeFakeIndexedDB();
  vi.stubGlobal("indexedDB", fakeDb);
});

const DRAFT = {
  slug: "noir-premiere",
  familyId: "fam-1",
  files: [
    { blob: new Blob(["a"], { type: "image/png" }), name: "a.png", type: "image/png", role: "person" },
    { blob: new Blob(["b"], { type: "image/png" }), name: "b.png", type: "image/png", role: "outfit" },
  ],
  options: { era: "70s" },
  sizeName: "Square (1:1)",
  prompt: null,
};

describe("anonymous draft v2", () => {
  it("round-trips ordered multi-image files with roles", async () => {
    expect(await saveStudioDraft(DRAFT)).toBe(true);
    const draft = await loadStudioDraft("noir-premiere");
    expect(draft?.version).toBe(2);
    expect(draft?.files.map((f) => f.name)).toEqual(["a.png", "b.png"]);
    expect(draft?.files.map((f) => f.role)).toEqual(["person", "outfit"]);
    expect(draft?.options).toEqual({ era: "70s" });
    expect(draft?.sizeName).toBe("Square (1:1)");
  });

  it("migrates a legacy single-file draft into files[0]", async () => {
    fakeDb.data.set("create-draft", {
      slug: "noir-premiere",
      file: new Blob(["old"], { type: "image/jpeg" }),
      fileName: "old.jpg",
      fileType: "image/jpeg",
      options: { era: "80s" },
      sizeName: null,
      savedAt: Date.now(),
    });
    const draft = await loadStudioDraft("noir-premiere");
    expect(draft?.version).toBe(2);
    expect(draft?.files).toHaveLength(1);
    expect(draft?.files[0]?.name).toBe("old.jpg");
    expect(draft?.files[0]?.role).toBeNull();
    expect(draft?.options).toEqual({ era: "80s" });
  });

  it("restores on a family-id match even for a different slug", async () => {
    await saveStudioDraft(DRAFT);
    // A sibling variant's slug doesn't match — the family id carries it.
    expect(await loadStudioDraft("noir-premiere-bw")).toBeNull();
    expect(await loadStudioDraft("noir-premiere-bw", "fam-1")).not.toBeNull();
  });

  it("expires drafts past the retention window and clears them", async () => {
    await saveStudioDraft(DRAFT);
    const stored = fakeDb.data.get("create-draft") as { savedAt: number };
    stored.savedAt = Date.now() - 8 * 24 * 60 * 60 * 1000;
    expect(await loadStudioDraft("noir-premiere")).toBeNull();
    // The expired record is removed, not left to rot.
    await new Promise((r) => setTimeout(r, 10));
    expect(fakeDb.data.has("create-draft")).toBe(false);
  });

  it("reports save failure honestly when IndexedDB is unavailable", async () => {
    vi.stubGlobal("indexedDB", {
      open: () => {
        const request: Record<string, unknown> = {};
        queueMicrotask(() =>
          (request.onerror as (() => void) | undefined)?.()
        );
        return request;
      },
    });
    expect(await saveStudioDraft(DRAFT)).toBe(false);
    expect(await loadStudioDraft("noir-premiere")).toBeNull();
  });

  it("clears a saved draft", async () => {
    await saveStudioDraft(DRAFT);
    await clearStudioDraft();
    expect(await loadStudioDraft("noir-premiere")).toBeNull();
  });
});
