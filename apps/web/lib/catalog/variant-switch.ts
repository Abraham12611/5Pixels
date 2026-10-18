import type { PublicInputCapability } from "@/types/catalog";

/**
 * Pure draft-compatibility model for switching between preset family
 * variants (#180). The create form owns the actual draft state — this
 * helper answers "what carries over to this sibling, and what must the UI
 * explain?" without ever mutating the draft or silently reconfiguring it.
 */

export interface DraftImage {
  assetId: string;
  /** Declared input role (#176); `null` = unassigned single-image slot. */
  role: string | null;
}

export interface VariantDraft {
  images: DraftImage[];
  prompt: string | null;
}

export interface CarriedImage extends DraftImage {
  /** Set when an unassigned image was suggested into a named target slot —
   *  surfaced as a notice, never applied silently. */
  assignedRole?: string;
}

export interface DroppedImage {
  image: DraftImage;
  reason: string;
}

export interface VariantSwitchResult {
  /** Images that apply on the target variation, in original order. */
  images: CarriedImage[];
  /** Images that cannot carry, each with a user-facing reason. */
  dropped: DroppedImage[];
  /** Required target slots still unfilled after carrying. */
  missingRequiredRoles: string[];
  prompt: {
    /** True only when the target allows prompts AND the draft has one. */
    applied: boolean;
    /** Draft text is never discarded — it stays saved for later use. */
    preserved: boolean;
    reason: string | null;
  };
  /** De-duplicated user-facing summary lines for notice UIs. */
  notices: string[];
}

const CLOSED_CAPABILITY: PublicInputCapability = {
  mode: "single",
  min_images: 1,
  max_images: 1,
  roles: [],
  prompt: { enabled: false, max_chars: 0 },
};

/**
 * Assess which draft inputs carry to `target`. Missing capability data
 * defaults to the most restrictive contract (single image, no prompt) —
 * matching the server, where absent permission means disabled.
 */
export function assessVariantSwitch(
  target: PublicInputCapability | null | undefined,
  draft: VariantDraft
): VariantSwitchResult {
  const cap = target ?? CLOSED_CAPABILITY;
  const roles = cap.roles ?? [];
  const declaredRoles = roles.map((r) => r.name);
  const requiredRoles = roles.filter((r) => !r.optional).map((r) => r.name);
  const maxImages = Math.max(cap.max_images, 0);

  const carried: CarriedImage[] = [];
  const dropped: DroppedImage[] = [];

  const noSlotReason = (role: string) =>
    `this variation has no “${role}” image slot`;

  for (const image of draft.images) {
    // Role eligibility first — an undeclared slot reports its own reason
    // even when the target is already at capacity.
    if (image.role !== null && !declaredRoles.includes(image.role)) {
      dropped.push({ image, reason: noSlotReason(image.role) });
      continue;
    }

    if (carried.length >= maxImages) {
      dropped.push({
        image,
        reason: `this variation accepts at most ${maxImages} image${maxImages === 1 ? "" : "s"}`,
      });
      continue;
    }

    if (image.role !== null) {
      carried.push(image);
      continue;
    }

    // Unassigned image (e.g. from a single-image preset): if the target
    // declares named slots, suggest the first unfilled one — surfaced via
    // `assignedRole` so the host can explain it rather than silently
    // re-slotting.
    if (declaredRoles.length > 0) {
      const used = new Set(carried.map((c) => c.role));
      const fill =
        requiredRoles.find((r) => !used.has(r)) ??
        declaredRoles.find((r) => !used.has(r));
      if (fill) {
        carried.push({ ...image, role: fill, assignedRole: fill });
      } else {
        dropped.push({ image, reason: "no open image slot on this variation" });
      }
      continue;
    }

    carried.push(image);
  }

  const usedRoles = new Set(
    carried.map((c) => c.role).filter((r): r is string => r !== null)
  );
  const missingRequiredRoles = requiredRoles.filter((r) => !usedRoles.has(r));

  const hasPrompt = Boolean(draft.prompt?.trim());
  const prompt = !hasPrompt
    ? { applied: false, preserved: false, reason: null }
    : cap.prompt.enabled
      ? { applied: true, preserved: true, reason: null }
      : {
          applied: false,
          preserved: true,
          reason:
            "Custom prompts aren’t available on this variation — your text stays saved but won’t be applied",
        };

  const notices: string[] = [];
  if (prompt.reason) notices.push(prompt.reason);
  for (const c of carried) {
    if (c.assignedRole) {
      notices.push(`your image will be used as “${c.assignedRole}”`);
    }
  }
  for (const d of dropped) notices.push(`an image won’t carry — ${d.reason}`);
  for (const role of missingRequiredRoles) {
    notices.push(`this variation needs a “${role}” image`);
  }

  return { images: carried, dropped, missingRequiredRoles, prompt, notices };
}
