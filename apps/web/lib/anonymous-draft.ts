/**
 * Anonymous create-studio draft. Stages the picked photo(s) + option values
 * in IndexedDB so the setup survives the sign-in/sign-up round trip without
 * the photos ever touching the server before authentication. Drafts expire
 * after 7 days and are cleared once consumed.
 *
 * v2 (#178): ordered multi-image files with declared roles. A legacy v1
 * single-file draft is migrated transparently on load.
 */

const DB_NAME = "fivepixels-studio";
const STORE = "drafts";
const KEY = "create-draft";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const DRAFT_VERSION = 2;

/** One staged input — order in `files` is the submission ordinal. */
export interface StudioDraftFile {
  blob: Blob;
  name: string;
  type: string;
  /** Declared role name from the version's input capability, when any. */
  role: string | null;
}

export interface StudioDraft {
  version: number;
  slug: string;
  /** Family root id — lets a sibling-variant switch restore the same staged
   *  images on a different slug without an exact-slug match (#178/#180). */
  familyId: string | null;
  /** Ordered inputs; index 0 is the primary (ordinal-1) image. */
  files: StudioDraftFile[];
  options: Record<string, unknown>;
  sizeName: string | null;
  /** Reserved for the prompt composer (#182) — gated by prompt_override_enabled. */
  prompt: string | null;
  /** Carried-variant explanations (#180) — the assessVariantSwitch notices
   *  a sibling switch produced for this setup, surfaced once on restore. */
  notices?: string[];
  savedAt: number;
}

export type StudioDraftInput = Omit<StudioDraft, "savedAt" | "version">;

/** Shape written before multi-image drafts existed (#178 migration source). */
interface LegacyStudioDraftV1 {
  slug: string;
  file: Blob;
  fileName: string;
  fileType: string;
  options: Record<string, unknown>;
  sizeName: string | null;
  savedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Accepts a v1 or v2 record; returns null when the shape is unusable. */
function migrateDraft(raw: unknown): StudioDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Partial<StudioDraft> & Partial<LegacyStudioDraftV1>;

  if (record.version === DRAFT_VERSION && Array.isArray(record.files)) {
    return {
      version: DRAFT_VERSION,
      slug: record.slug ?? "",
      familyId: record.familyId ?? null,
      files: record.files,
      options: record.options ?? {},
      sizeName: record.sizeName ?? null,
      prompt: record.prompt ?? null,
      notices: Array.isArray(record.notices)
        ? record.notices.filter((n): n is string => typeof n === "string")
        : undefined,
      savedAt: record.savedAt ?? 0,
    };
  }

  // v1: single `file` field → files[0].
  if (record.file instanceof Blob) {
    return {
      version: DRAFT_VERSION,
      slug: record.slug ?? "",
      familyId: null,
      files: [
        {
          blob: record.file,
          name: record.fileName ?? "photo",
          type: record.fileType ?? "image/jpeg",
          role: null,
        },
      ],
      options: record.options ?? {},
      sizeName: record.sizeName ?? null,
      prompt: null,
      savedAt: record.savedAt ?? 0,
    };
  }

  return null;
}

/**
 * Persist the draft. Returns false when IndexedDB is unavailable or quota
 * denies the write — callers should surface that honestly rather than claim
 * the setup was saved.
 */
export async function saveStudioDraft(
  input: StudioDraftInput
): Promise<boolean> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(
        { ...input, version: DRAFT_VERSION, savedAt: Date.now() },
        KEY
      );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return true;
  } catch {
    // IDB unavailable (private mode) or quota exceeded — caller decides how
    // honest to be; the draft simply won't persist.
    return false;
  }
}

/**
 * Load a draft for `slug`, or for any member of `familyId` — a sibling
 * variant switch within a preset family keeps the staged images (#178).
 */
export async function loadStudioDraft(
  slug?: string,
  familyId?: string | null
): Promise<StudioDraft | null> {
  try {
    const db = await openDb();
    const raw = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();

    const draft = migrateDraft(raw);
    if (!draft) return null;

    const slugMatch = slug === undefined || draft.slug === slug;
    const familyMatch =
      familyId !== undefined &&
      familyId !== null &&
      draft.familyId === familyId;
    if (!slugMatch && !familyMatch) return null;

    if (Date.now() - draft.savedAt > MAX_AGE_MS) {
      void clearStudioDraft();
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export async function clearStudioDraft(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // best effort
  }
}
