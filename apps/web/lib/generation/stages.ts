/**
 * Maps raw generation statuses to the consumer-facing staged progress model.
 * Raw statuses (created/uploaded/validating/queued/generating/post_processing)
 * are implementation detail; users see four calm stages plus terminal states.
 */

export type GenerationStageId =
  | "preparing"
  | "queued"
  | "generating"
  | "finishing";

export interface GenerationStage {
  id: GenerationStageId;
  label: string;
  description: string;
}

export const GENERATION_STAGES: GenerationStage[] = [
  {
    id: "preparing",
    label: "Preparing your image",
    description: "Securing and checking your photo",
  },
  {
    id: "queued",
    label: "In the queue",
    description: "Your transformation is waiting for a slot",
  },
  {
    id: "generating",
    label: "Applying the look",
    description: "This usually takes under a minute",
  },
  {
    id: "finishing",
    label: "Refining details",
    description: "Polishing the final image",
  },
];

export const TERMINAL_STATUSES = [
  "completed",
  "failed",
  "blocked",
  "cancelled",
] as const;

export function isTerminalStatus(status: string): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}

export function isFailureStatus(status: string): boolean {
  return status === "failed" || status === "blocked" || status === "cancelled";
}

/**
 * Returns the active stage for a non-terminal status, or null for terminal
 * statuses. Unknown statuses fall back to "preparing" so the UI never breaks
 * on a new backend status.
 */
export function stageForStatus(status: string): GenerationStage | null {
  if (isTerminalStatus(status)) return null;
  switch (status) {
    case "queued":
      return GENERATION_STAGES[1]!;
    case "generating":
      return GENERATION_STAGES[2]!;
    case "post_processing":
      return GENERATION_STAGES[3]!;
    default:
      // created, uploaded, validating, and anything unrecognized
      return GENERATION_STAGES[0]!;
  }
}

/** Index of the active stage (0–3), or -1 for terminal statuses. */
export function stageIndexForStatus(status: string): number {
  const stage = stageForStatus(status);
  return stage ? GENERATION_STAGES.findIndex((s) => s.id === stage.id) : -1;
}

/**
 * Number of the five motif pixels that read as "filled" while a generation
 * runs (1–4). A completed generation lights all five; failures light none.
 */
export function pixelCountForStatus(status: string): number {
  if (status === "completed") return 5;
  if (isFailureStatus(status)) return 0;
  const index = stageIndexForStatus(status);
  return index < 0 ? 0 : index + 1;
}

export interface StatusCopy {
  title: string;
  body: string;
  /** One-line credit outcome shown on terminal failure states. */
  credit?: string;
}

/**
 * Human-facing copy for each status. Never leaks provider/inference terms.
 */
export function statusCopy(
  status: string,
  statusDetail?: string | null
): StatusCopy {
  if (status === "completed") {
    return {
      title: "Your result is ready",
      body: "Opening your transformation…",
    };
  }
  if (status === "failed") {
    return {
      title: "Something didn't work",
      body:
        statusDetail ??
        "The transformation couldn't be completed this time.",
      credit: "Your credits were returned to your balance.",
    };
  }
  if (status === "blocked") {
    return {
      title: "This transformation can't run",
      body:
        statusDetail ??
        "The image doesn't meet the requirements for this look.",
      credit: "No credits were charged.",
    };
  }
  if (status === "cancelled") {
    return {
      title: "Transformation cancelled",
      body: "This run was cancelled before it finished.",
      credit: "No credits were charged.",
    };
  }
  const stage = stageForStatus(status);
  return {
    title: stage?.label ?? "Working",
    body: stage?.description ?? "Your transformation is in progress.",
  };
}

/** Soft warning shown when an active generation runs long. */
export const LONG_WAIT_THRESHOLD_MS = 45_000;
export const LONG_WAIT_MESSAGE =
  "It's taking a little longer than usual — still working.";
