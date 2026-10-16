import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SavePipeline,
  type StudioSaveResult,
  type StudioSaveState,
} from "../save-pipeline";

/**
 * The studio's correctness contract (#126): debounce coalesces, saves are
 * strictly serialized, the newest snapshot wins, failures re-queue without
 * losing content, conflicts halt everything, and "saved" only fires after a
 * server acknowledgement with nothing left pending.
 */

interface Snap {
  doc: string;
}

function deferred() {
  let resolve!: (v: StudioSaveResult) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<StudioSaveResult>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makePipeline(
  save: (snap: Snap, source: string) => Promise<StudioSaveResult>
) {
  const states: StudioSaveState[] = [];
  const savedVersions: number[] = [];
  const pipeline = new SavePipeline<Snap>({
    save: (s, source) => save(s, source),
    debounceMs: 100,
    onStateChange: (s) => states.push(s),
    onSaved: (v) => savedVersions.push(v),
  });
  return { pipeline, states, savedVersions };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const ok = (editVersion: number): StudioSaveResult => ({ ok: true, editVersion });

describe("SavePipeline", () => {
  it("debounces rapid queues into one save of the latest snapshot", async () => {
    const save = vi.fn(async (s: Snap) => ok(s.doc === "c" ? 3 : 1));
    const { pipeline, states } = makePipeline(save);

    pipeline.queue({ doc: "a" });
    pipeline.queue({ doc: "b" });
    pipeline.queue({ doc: "c" });
    await vi.advanceTimersByTimeAsync(150);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(
      { doc: "c" },
      "autosave"
    );
    expect(states).toEqual(["dirty", "saving", "saved"]);
  });

  it("serializes saves — a newer edit during a slow save runs a second save", async () => {
    const first = deferred();
    const save = vi
      .fn<(s: Snap) => Promise<StudioSaveResult>>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementation(async () => ok(9));
    const { pipeline, states, savedVersions } = makePipeline(save);

    pipeline.queue({ doc: "v1" });
    await vi.advanceTimersByTimeAsync(150);
    expect(save).toHaveBeenCalledTimes(1);

    // Newer edit arrives while the first save is still in flight.
    pipeline.queue({ doc: "v2" });
    first.resolve(ok(4));
    await vi.advanceTimersByTimeAsync(0);

    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith({ doc: "v2" }, "autosave");
    expect(savedVersions).toEqual([4, 9]);
    // "saved" fires only once — after the LAST pending snapshot is acked.
    expect(states.filter((s) => s === "saved")).toHaveLength(1);
    expect(states.at(-1)).toBe("saved");
  });

  it("a slow response never lets 'saved' claim victory over newer work", async () => {
    const first = deferred();
    const save = vi
      .fn<(s: Snap) => Promise<StudioSaveResult>>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementation(async () => ok(2));
    const { pipeline, states } = makePipeline(save);

    pipeline.queue({ doc: "v1" });
    await vi.advanceTimersByTimeAsync(150);
    pipeline.queue({ doc: "v2" });
    first.resolve(ok(1));
    // Resolve the in-flight save; the pipeline must re-drain the pending
    // snapshot before ever emitting 'saved'.
    await vi.advanceTimersByTimeAsync(150);

    const savedIdx = states.lastIndexOf("saved");
    const dirtyAfter = states.indexOf("dirty", states.indexOf("saving"));
    expect(dirtyAfter).toBeGreaterThan(-1);
    expect(savedIdx).toBe(states.length - 1);
  });

  it("re-queues a failed save so content survives; retry sends it", async () => {
    const save = vi
      .fn<(s: Snap) => Promise<StudioSaveResult>>()
      .mockImplementationOnce(async () => ({ ok: false, error: "offline" }))
      .mockImplementation(async () => ok(5));
    const { pipeline, states } = makePipeline(save);

    pipeline.queue({ doc: "precious" });
    await vi.advanceTimersByTimeAsync(150);

    expect(states.at(-1)).toBe("error");
    expect(pipeline.hasUnsaved()).toBe(true);

    pipeline.retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenLastCalledWith({ doc: "precious" }, "autosave");
    expect(states.at(-1)).toBe("saved");
  });

  it("an edit_version conflict stops the pipeline and ignores later queues", async () => {
    const save = vi
      .fn<(s: Snap) => Promise<StudioSaveResult>>()
      .mockImplementation(async () => ({ ok: false, conflict: true }));
    const { pipeline, states } = makePipeline(save);

    pipeline.queue({ doc: "mine" });
    await vi.advanceTimersByTimeAsync(150);
    expect(states.at(-1)).toBe("conflict");

    pipeline.queue({ doc: "still-editing" });
    await vi.advanceTimersByTimeAsync(500);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("flushNow saves immediately with the given source and reports completion", async () => {
    const save = vi.fn(async () => ok(7));
    const { pipeline } = makePipeline(save);

    pipeline.queue({ doc: "draft" });
    const done = await pipeline.flushNow("manual");

    expect(done).toBe(true);
    expect(save).toHaveBeenCalledWith({ doc: "draft" }, "manual");
    expect(pipeline.hasUnsaved()).toBe(false);
  });

  it("flushNow resolves false when the save fails, keeping the snapshot", async () => {
    const save = vi.fn(async () => ({ ok: false, error: "down" }));
    const { pipeline } = makePipeline(save);

    pipeline.queue({ doc: "draft" });
    const done = await pipeline.flushNow();

    expect(done).toBe(false);
    expect(pipeline.hasUnsaved()).toBe(true);
  });

  it("hasUnsaved is true while dirty or in flight, false when clean", async () => {
    const gate = deferred();
    const save = vi
      .fn<(s: Snap) => Promise<StudioSaveResult>>()
      .mockImplementationOnce(() => gate.promise)
      .mockImplementation(async () => ok(1));
    const { pipeline } = makePipeline(save);

    expect(pipeline.hasUnsaved()).toBe(false);
    pipeline.queue({ doc: "x" });
    expect(pipeline.hasUnsaved()).toBe(true);
    await vi.advanceTimersByTimeAsync(150);
    expect(pipeline.hasUnsaved()).toBe(true); // in flight
    gate.resolve(ok(1));
    await vi.advanceTimersByTimeAsync(0);
    expect(pipeline.hasUnsaved()).toBe(false);
  });
});
