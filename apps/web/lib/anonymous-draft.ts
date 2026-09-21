/**
 * Anonymous create-studio draft. Stages the picked photo + option values in
 * IndexedDB so the setup survives the sign-in/sign-up round trip without the
 * photo ever touching the server before authentication. Drafts expire after
 * 7 days and are cleared once consumed.
 */

const DB_NAME = "fivepixels-studio";
const STORE = "drafts";
const KEY = "create-draft";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface StudioDraft {
  slug: string;
  file: Blob;
  fileName: string;
  fileType: string;
  options: Record<string, unknown>;
  sizeName: string | null;
  savedAt: number;
}

export type StudioDraftInput = Omit<StudioDraft, "savedAt">;

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

export async function saveStudioDraft(
  input: StudioDraftInput
): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ ...input, savedAt: Date.now() }, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IDB unavailable (private mode) — draft simply won't persist.
  }
}

export async function loadStudioDraft(
  slug: string
): Promise<StudioDraft | null> {
  try {
    const db = await openDb();
    const draft = await new Promise<StudioDraft | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(KEY);
      request.onsuccess = () =>
        resolve((request.result as StudioDraft | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();

    if (!draft || draft.slug !== slug) return null;
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
