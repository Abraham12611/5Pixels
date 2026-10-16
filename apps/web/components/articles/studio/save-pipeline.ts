/**
 * Serialized autosave pipeline for the Articles studio (#126).
 *
 * Guarantees:
 *  - At most one save in flight — a slow response can never overwrite a
 *    newer document because the next save only starts after it settles.
 *  - The newest dirty snapshot always wins; failed saves are re-queued
 *    (unless a newer snapshot superseded them) so content is never lost.
 *  - An edit_version conflict stops the pipeline — the studio surfaces a
 *    reload affordance instead of retrying blindly.
 *  - "saved" is emitted only after a server acknowledgement and only when
 *    no newer snapshot is already queued.
 */

export type StudioSaveSource = "autosave" | "manual";

export type StudioSaveState =
  | "clean"
  | "dirty"
  | "saving"
  | "saved"
  | "error"
  | "conflict";

export interface StudioSaveResult {
  ok: boolean;
  /** articles.edit_version after a successful save. */
  editVersion?: number;
  /** The write was rejected because a newer version exists server-side. */
  conflict?: boolean;
  error?: string;
}

interface QueuedSnapshot<T> {
  snapshot: T;
  source: StudioSaveSource;
}

export interface SavePipelineOptions<T> {
  save: (snapshot: T, source: StudioSaveSource) => Promise<StudioSaveResult>;
  /** Debounce for autosave scheduling. */
  debounceMs?: number;
  onStateChange?: (state: StudioSaveState) => void;
  /** Server-acknowledged save — carries the fresh edit_version. */
  onSaved?: (editVersion: number) => void;
}

export class SavePipeline<T> {
  private pending?: QueuedSnapshot<T>;
  private inFlight = false;
  private stopped = false;
  private lastEmitted: StudioSaveState = "clean";
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly debounceMs: number;

  constructor(private readonly options: SavePipelineOptions<T>) {
    this.debounceMs = options.debounceMs ?? 900;
  }

  private emit(state: StudioSaveState) {
    // Transitions, not raw events — three rapid edits are still one "dirty".
    if (state === this.lastEmitted) return;
    this.lastEmitted = state;
    this.options.onStateChange?.(state);
  }

  /** Queue a snapshot for autosave. The latest call wins. */
  queue(snapshot: T): void {
    if (this.stopped) return;
    this.pending = { snapshot, source: "autosave" };
    this.emit("dirty");
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.drain(), this.debounceMs);
  }

  /**
   * Save immediately (explicit Save, or pre-publish flush). Awaits the full
   * drain and resolves true when everything queued was acknowledged.
   */
  async flushNow(source: StudioSaveSource = "manual"): Promise<boolean> {
    if (this.timer) clearTimeout(this.timer);
    if (this.pending) this.pending.source = source;
    await this.drain();
    return !this.pending && !this.stopped;
  }

  /** Retry after a transient failure — the failed snapshot was re-queued. */
  retry(): void {
    if (this.stopped) return;
    void this.drain();
  }

  /** Unsaved work exists — drives the navigation/unload warning. */
  hasUnsaved(): boolean {
    return this.pending !== undefined || this.inFlight;
  }

  destroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  private async drain(): Promise<void> {
    if (this.inFlight || this.stopped) return;
    this.inFlight = true;
    try {
      while (this.pending && !this.stopped) {
        const { snapshot, source } = this.pending;
        this.pending = undefined;
        this.emit("saving");
        let result: StudioSaveResult;
        try {
          result = await this.options.save(snapshot, source);
        } catch (err) {
          result = {
            ok: false,
            error: err instanceof Error ? err.message : "Save failed",
          };
        }
        if (result.ok) {
          if (typeof result.editVersion === "number") {
            this.options.onSaved?.(result.editVersion);
          }
          // Newer edits may have queued while this save was in flight —
          // only claim "saved" when nothing remains.
          this.emit(this.pending ? "dirty" : "saved");
          continue;
        }
        if (result.conflict) {
          this.stopped = true;
          this.emit("conflict");
          break;
        }
        // Transient failure — restore the failed snapshot unless a newer
        // one already superseded it; content is never dropped.
        if (!this.pending) this.pending = { snapshot, source };
        this.emit("error");
        break;
      }
    } finally {
      this.inFlight = false;
    }
  }
}
