"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { v4 as uuidv4 } from "uuid";
import {
  ArrowRight,
  Check,
  CircleNotch,
  Sparkle,
  Warning,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { PresetPromptComposer } from "@/components/consumer/preset-prompt-composer";
import { PresetFamilySelector } from "@/components/consumer/preset-family-selector";
import { StudioStage } from "@/components/consumer/studio-stage";
import {
  PresetImageInputs,
  type InputSlotStatus,
} from "@/components/consumer/preset-image-inputs";
import {
  DockedActionBar,
  MobilePageBottomSpacer,
} from "@/components/consumer/mobile/docked-action-bar";
import { AspectRatioMenu } from "@/components/consumer/aspect-ratio-menu";
import { SettingTile } from "@/components/consumer/setting-tile";
import { CreditConfirmDialog } from "@/components/consumer/credit-confirm-dialog";
import { BlockedCreditSurface } from "@/components/consumer/blocked-credit-surface";
import { AuthModal } from "@/components/auth/auth-modal";
import { Button } from "@/components/ui/button";
import { normalizeField, sortFields } from "@/lib/catalog/fields";
import { publicAssetUrl } from "@/lib/catalog/media";
import {
  classifySourceDimensions,
  classifySourceFile,
  validateGenerationOptions,
} from "@/lib/generation/validation";
import { createAndSubmitGeneration } from "@/lib/generation/actions";
import { estimateGenerationCost } from "@/lib/billing/credit-cost";
import {
  shouldConfirmCost,
  SKIP_COST_CONFIRM_KEY,
} from "@/lib/generation/credit-confirm";
import { quoteFingerprintKey } from "@/lib/generation/quote-fingerprint";
import { assessVariantSwitch } from "@/lib/catalog/variant-switch";
import type { FamilyRailMember } from "@/lib/catalog/family";
import {
  finalizeSourceUpload,
  prepareSourceUpload,
} from "@/lib/generation/upload";
import {
  clearStudioDraft,
  loadStudioDraft,
  saveStudioDraft,
  type StudioDraftFile,
} from "@/lib/anonymous-draft";
import { cn } from "@/lib/utils";
import { useOnline } from "@/lib/ui/use-online";
import type {
  PublicInputCapability,
  PublicProductDetail,
  OutputSizeOption,
} from "@/types/catalog";
import type { PlanForPurchase } from "@/lib/db/plans";
import type { CreditPack } from "@/lib/billing/credit-packs";
import type { BlockedCreditContext } from "@/lib/billing/segments";
import type { OfferAssignment } from "@/lib/offers/engine";

interface ReusedSource {
  assetId: string;
  url: string;
  name: string;
  /** Role the switch-time assessment resolved for this input — `null` fills
   *  positionally, matching the pre-#180 Adjust behavior. */
  role?: string | null;
}

/** One media slot in a multi-image preset (#178). Slot index is the role
 *  position — declared roles and optional flags come from the version's
 *  input capability, so a photo keeps its role even when a middle slot is
 *  empty. The submission array is the filled slots in order. */
interface InputSlot {
  id: string;
  role: string | null;
  roleLabel: string;
  optional: boolean;
  status: InputSlotStatus;
  file: File | null;
  reused: ReusedSource | null;
  previewUrl: string | null;
  dims: { width: number; height: number } | null;
  /** Finalized user-asset id once uploaded (authenticated only). */
  assetId: string | null;
  error: string | null;
  warning: string | null;
}

function humanizeRole(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Positional slots from the version's input capability — always at least
 *  one; only `multi` presets produce more. */
function buildInputSlots(product: PublicProductDetail): InputSlot[] {
  const cap = product.input_capability;
  const max = cap?.mode === "multi" ? Math.max(1, cap.max_images) : 1;
  const min = Math.max(1, cap?.min_images ?? 1);
  return Array.from({ length: max }, (_, i) => {
    const role = cap?.roles?.[i] ?? null;
    return {
      id: `slot-${i}`,
      role: role?.name ?? null,
      roleLabel: role ? humanizeRole(role.name) : `Photo ${i + 1}`,
      optional: role?.optional === true || i >= min,
      status: "empty" as InputSlotStatus,
      file: null,
      reused: null,
      previewUrl: null,
      dims: null,
      assetId: null,
      error: null,
      warning: null,
    };
  });
}

function blankSlot(slot: InputSlot): InputSlot {
  return { ...slot, status: "empty", file: null, reused: null,
    previewUrl: null, dims: null, assetId: null, error: null, warning: null };
}

/** Decode a picked file's real dimensions — createImageBitmap first (a
 *  separate decoder path that survives the blob-URL failures Chrome on
 *  Android intermittently hits with content://-backed picks), <img> retry
 *  as the fallback. */
async function decodeImageDims(
  file: File
): Promise<{ width: number; height: number } | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      const dims = { width: bmp.width, height: bmp.height };
      bmp.close();
      if (dims.width > 0 && dims.height > 0) return dims;
    } catch {
      // fall through to the <img> path
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const dims = await new Promise<{ width: number; height: number } | null>(
      (resolve) => {
        const img = new window.Image();
        let retries = 0;
        img.onload = () =>
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => {
          if (retries++ < 2) {
            setTimeout(() => {
              img.src = url;
            }, 250);
          } else {
            resolve(null);
          }
        };
        img.src = url;
      }
    );
    return dims && dims.width > 0 && dims.height > 0 ? dims : null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Decode dims for an already-hosted (reused/carried) source URL — no file
 *  body, so the <img> path is the only option. */
async function decodeUrlDims(
  url: string
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    let retries = 0;
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => {
      if (retries++ < 2) {
        setTimeout(() => {
          img.src = url;
        }, 250);
      } else {
        resolve(null);
      }
    };
    img.src = url;
  });
}

type PricingStatus = "loading" | "ready" | "unavailable" | "failed";

/** Server-price lifecycle for the configured generation. Generate and the
 * cost confirmation only trust `ready`, and only while `fingerprint` still
 * matches the inputs on screen — a stale response can never price new
 * inputs, and an unknown price is never treated as zero. */
interface PriceQuote {
  status: PricingStatus;
  /** Quoted credits — only set when status is "ready". */
  credits: number | null;
  fingerprint: string;
}

interface CreateGenerationFormProps {
  /** null when anonymous — the studio works without an account until Generate. */
  userId: string | null;
  product: PublicProductDetail;
  initialBalance: number;
  /** Whether the user has any prior generation — drives first-run cost confirmation. */
  hasPriorGenerations: boolean;
  /** Degraded mode: transformations paused, browsing still available. */
  generationPaused?: boolean;
  /** Pre-filled source from an earlier generation (Adjust flow). */
  initialSource?: ReusedSource | null;
  /** Additional carried inputs — sibling-variant hand-off or a multi-input
   *  Adjust restore. Ownership was already enforced when the signed URLs
   *  were minted server-side. A carried `role` lands on the matching named
   *  slot; `null` fills the first open slot positionally. */
  initialInputs?: ReusedSource[] | null;
  /** Ordered root-then-siblings for the "Styles in this set" rail (#180).
   *  Empty for standalone presets — no selector renders. */
  family?: FamilyRailMember[];
  /** Deploy-level release for multi-image inputs (#178) — the admin
   *  capability is a precondition; while the provider pipeline (#193)
   *  isn't live, multi presets render the one-photo experience. */
  multiInputReleased?: boolean;
  promptReleased?: boolean;
  initialOptions?: Record<string, unknown> | null;
  initialSize?: OutputSizeOption | null;
  /** The owner's own prompt from an earlier run (Adjust flow) — seeds the
   *  composer on prompt-eligible presets only, never rendered elsewhere. */
  initialPrompt?: string | null;
  /** Purchasable plans for the credits paywall (insufficient balance). */
  plans: PlanForPurchase[];
  /** Segment-resolved billing context — null when anonymous. */
  blocked: BlockedCreditContext | null;
  /** Campaign ladder for offer-eligible segments (new/free users). */
  offer: OfferAssignment | null;
  /** Credit packs + translation basis for the in-place top-up. */
  topUp: {
    packs: CreditPack[];
    creditsPerTransformation: number | null;
  } | null;
  /** The signed-in user's human referral code — drives /r/<code> share links. */
  referralCode?: string;
}

function getDefaultSize(sizes: OutputSizeOption[] | undefined): OutputSizeOption {
  const available = sizes?.length
    ? sizes
    : [{ name: "Square (1:1)", width: 1024, height: 1024, is_default: true }];
  return available.find((s) => s.is_default) ?? available[0]!;
}

const SUBMIT_STEPS = [
  "Uploading your photo",
  "Preparing the transformation",
  "Starting",
] as const;

/**
 * PUT the photo straight to the signed storage URL. The body goes as
 * multipart FormData — the exact shape the official `uploadToSignedUrl`
 * uses — because `fetch` with a bare `File` body fails outright on some
 * mobile browsers ("Failed to fetch"). One automatic retry covers flaky
 * connections; `x-upsert` makes a retry to the same path succeed.
 */
async function uploadSourceToSignedUrl(
  signedUrl: string,
  file: File
): Promise<void> {
  let networkFailed = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const form = new FormData();
      form.append("cacheControl", "3600");
      form.append("", file);
      const upload = await fetch(signedUrl, {
        method: "PUT",
        body: form,
        headers: { "x-upsert": "true" },
      });
      if (upload.ok) return;
      throw new Error("Image upload failed. Please try again.");
    } catch (err) {
      if (err instanceof TypeError) {
        networkFailed = true;
        continue;
      }
      throw err;
    }
  }
  if (networkFailed) {
    throw new Error(
      "Couldn't reach the upload service — check your connection and try again."
    );
  }
}

function submitStepIndex(progress: string): number {
  if (progress.startsWith("Preparing secure")) return 0;
  if (progress.startsWith("Uploading")) return 0;
  if (progress.startsWith("Finalizing")) return 1;
  return 2;
}

/** Router bridge for the family rail — `useRouter` lives here so the form
 *  only pays for the hook (and its test mocks) when a preset actually has
 *  sibling variations to switch to (#180). */
function VariantSwitchRail({
  members,
  currentProductId,
  noticeFor,
  onSwitch,
}: {
  members: FamilyRailMember[];
  currentProductId: string;
  noticeFor: (member: FamilyRailMember) => string | null;
  onSwitch: (member: FamilyRailMember, navigate: (href: string) => void) => void;
}) {
  const router = useRouter();
  return (
    <PresetFamilySelector
      members={members}
      currentProductId={currentProductId}
      noticeFor={noticeFor}
      onSelect={(member) => onSwitch(member, (href) => router.push(href))}
    />
  );
}

export function CreateGenerationForm({
  userId,
  referralCode,
  product,
  initialBalance,
  hasPriorGenerations,
  generationPaused = false,
  initialSource,
  initialInputs,
  family = [],
  multiInputReleased = false,
  promptReleased = false,
  initialOptions,
  initialSize,
  initialPrompt,
  plans,
  blocked,
  offer,
  topUp,
}: CreateGenerationFormProps) {
  const isAnonymous = userId === null;
  const inputCapability = product.input_capability ?? null;
  // The admin capability is a precondition, not the release — while the
  // provider pipeline can't honor the full input set, a multi-capable
  // preset degrades to the one-photo flow rather than erroring on submit.
  const isMulti =
    multiInputReleased && (inputCapability?.max_images ?? 1) > 1;
  const minImages = Math.max(1, inputCapability?.min_images ?? 1);
  // Prompt eligibility is strictly per preset/version (#182) — never a
  // global flag, and ineligible presets render no actionable control and
  // submit no custom text.
  // Release-gated (#189 flag): the admin capability alone never exposes the
  // composer — until the protected release switches are enabled, prompt
  // overrides stay server-rejected and the UI matches that state.
  const promptAllowed =
    promptReleased && inputCapability?.prompt.enabled === true;
  const promptMaxChars = Math.max(1, inputCapability?.prompt.max_chars || 0);
  /** Multi-image slots — inactive for single-image presets, which keep the
   *  original one-photo path untouched (#178). Carried inputs seed it once:
   *  role-bound entries land on their named slot, unassigned fill the first
   *  open slot, and overflow is counted for the notice rather than dropped
   *  silently (#180). */
  const seededCarry = useMemo(() => {
    const built = buildInputSlots(product);
    const carried = [
      ...(initialSource ? [initialSource] : []),
      ...(initialInputs ?? []),
    ];
    let dropped = 0;
    for (const input of carried) {
      const idx = input.role
        ? built.findIndex(
            (s) => s.role === input.role && s.file === null && s.reused === null
          )
        : built.findIndex((s) => s.file === null && s.reused === null);
      if (idx < 0) {
        dropped++;
        continue;
      }
      built[idx] = {
        ...built[idx]!,
        status: "ready",
        reused: input,
        previewUrl: input.url,
        assetId: input.assetId,
      };
    }
    return { slots: built, dropped };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-time seed
  }, []);
  const [slots, setSlots] = useState<InputSlot[]>(seededCarry.slots);
  const [focusedSlotId, setFocusedSlotId] = useState<string>("slot-0");
  const [inputsNotice, setInputsNotice] = useState<string>(() =>
    seededCarry.dropped > 0
      ? seededCarry.dropped === 1
        ? "1 photo doesn't fit this variation's image slots."
        : `${seededCarry.dropped} photos don't fit this variation's image slots.`
      : ""
  );
  const [file, setFile] = useState<File | null>(null);
  const [reusedSource, setReusedSource] = useState<ReusedSource | null>(
    // A sibling switch into a single-image (or unreleased-multi) target
    // keeps the first carried photo on the one-photo path — slot seeding
    // above is inert for it, so this is where that image actually lands.
    initialSource ?? (!isMulti ? (initialInputs?.[0] ?? null) : null)
  );
  /** Object URL for the picked file — created in the pick handler, not
   * render, so StrictMode remounts can't revoke a URL still on screen. */
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [options, setOptions] = useState<Record<string, unknown>>(() => {
    const defaults: Record<string, unknown> = {};
    for (const field of sortFields(product.active_fields)) {
      defaults[field.field_key] = normalizeField(field).defaultValue;
    }
    return initialOptions ? { ...defaults, ...initialOptions } : defaults;
  });
  const [selectedSize, setSelectedSize] = useState<OutputSizeOption>(
    () => initialSize ?? getDefaultSize(product.output_sizes)
  );
  // Real dims of the loaded photo — drives "Match photo" previews/estimates.
  const [sourceDims, setSourceDims] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [priceQuote, setPriceQuote] = useState<PriceQuote | null>(null);
  /** Bump to refetch after a failed/unavailable attempt. */
  const [priceRetryKey, setPriceRetryKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const online = useOnline();
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string>("");
  /** Rejected pick (wrong type / too large) — inline under the source zone. */
  const [sourceError, setSourceError] = useState<string>("");
  /** Non-blocking quality warning (small / extreme shape). */
  const [sourceWarning, setSourceWarning] = useState<string>("");
  /** Last submit died during upload — the same file can retry without re-picking. */
  const [uploadFailed, setUploadFailed] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  /** The verified quote a confirmation/top-up was opened for — closed,
   * never repriced, when the configured inputs drift from it. */
  const [confirmQuote, setConfirmQuote] = useState<{
    credits: number;
    fingerprint: string;
  } | null>(null);
  const [insufficientQuote, setInsufficientQuote] = useState<{
    credits: number;
    fingerprint: string;
  } | null>(null);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [draftSaveWarning, setDraftSaveWarning] = useState(false);
  // Prompt composer (#182): opt-in per preset — the typed draft survives
  // collapse and drafts persist it, but only prompt-eligible presets ever
  // let it reach the request.
  const [promptOn, setPromptOn] = useState(
    () => promptAllowed && Boolean(initialPrompt?.trim())
  );
  const [promptText, setPromptText] = useState(
    () => (promptAllowed ? (initialPrompt?.trim() ?? "") : "")
  );
  /** Explains a carried/saved prompt that this preset can't apply. */
  const [promptNotice, setPromptNotice] = useState(
    () =>
      !promptAllowed && initialPrompt?.trim()
        ? "Your previous changes text isn't used by this look."
        : ""
  );
  /** Pinned moderation/validation message for the composer. */
  const [promptError, setPromptError] = useState("");
  const isPoster = product.type === "poster";
  const filledSlots = useMemo(
    () => slots.filter((s) => s.file !== null || s.reused !== null),
    [slots]
  );
  const focusedSlot = slots.find((s) => s.id === focusedSlotId) ?? slots[0];
  const hasSource = isMulti
    ? filledSlots.length > 0
    : Boolean(file) || Boolean(reusedSource);
  // match_source resolves from the ordinal-1 submission — the first filled
  // slot, which is what the server prices against (inputs[0]).
  const effectiveSourceDims = isMulti
    ? (filledSlots[0]?.dims ?? null)
    : sourceDims;

  // "Match photo" is billed on the resolved source dims — the estimate and
  // the fingerprint both use the measured photo size when we have it.
  const estimateSize = useMemo(
    () =>
      selectedSize.match_source && effectiveSourceDims
        ? { ...selectedSize, ...effectiveSourceDims }
        : selectedSize,
    [selectedSize, effectiveSourceDims]
  );
  // "Match photo" quotes need the real photo dims — while a source is
  // present but still decoding, fallback dims can't safely price this run.
  const dimsPending = Boolean(
    selectedSize.match_source && hasSource && effectiveSourceDims === null
  );
  /** Ordered input references as they would submit — asset id once the
   *  upload finalizes, else a stable local key so picks/swaps still shift
   *  the fingerprint and reprice rather than reuse a stale quote. */
  const fingerprintInputs = useMemo(() => {
    if (!isMulti) {
      const id =
        reusedSource?.assetId ??
        (file ? `local:${file.name}:${file.size}` : "none");
      return [{ id, role: null as string | null }];
    }
    return filledSlots.map((s) => ({
      id:
        s.assetId ??
        (s.file ? `local:${s.file.name}:${s.file.size}` : s.id),
      role: s.role,
    }));
  }, [isMulti, reusedSource, file, filledSlots]);
  /** The prompt exactly as it would submit — only ever non-empty on
   *  prompt-eligible presets with the composer on. The server quote binds
   *  its hash, so the client fingerprint must cover it too (#182). */
  const submitPrompt = promptAllowed && promptOn ? promptText.trim() : "";
  const promptOver =
    promptAllowed && promptOn && promptText.length > promptMaxChars;
  /** Structural key — everything cost-bearing *except* the prompt. Lets
   *  the quote effect tell a prompt keystroke (debounce the fetch) from a
   *  real configuration change (fetch immediately). */
  const structuralKey = quoteFingerprintKey({
    productVersionId: product.version_id ?? "none",
    outputSize: estimateSize,
    sourceDimsPending: dimsPending,
    inputs: fingerprintInputs,
  });
  const quoteFingerprint = quoteFingerprintKey({
    productVersionId: product.version_id ?? "none",
    outputSize: estimateSize,
    sourceDimsPending: dimsPending,
    inputs: fingerprintInputs,
    prompt: submitPrompt || undefined,
  });
  // A quote only counts while it still describes the inputs on screen —
  // anything else (in-flight fetch, stale response) reads as loading.
  const pricingStatus: PricingStatus = dimsPending
    ? "loading"
    : !isAnonymous && !product.version_id
      ? "unavailable"
      : priceQuote?.fingerprint === quoteFingerprint
        ? priceQuote.status
        : "loading";
  const displayCost =
    pricingStatus === "ready" ? (priceQuote?.credits ?? null) : null;
  const pricingReady = displayCost !== null;
  // An unknown price is not "insufficient balance" — they are distinct
  // states, and only a real quote can put the user behind it.
  const canAfford =
    isAnonymous || !pricingReady ? true : initialBalance >= displayCost;

  // Multi-image readiness (#178): enough slots filled to satisfy the
  // version's minimum, no required slot empty, nothing still uploading,
  // nothing flagged — and for the charged path, every staged input must
  // already be a finalized server asset. Anonymous intent stays reachable:
  // their files are validated and held locally until the auth round trip
  // lets the same pipeline upload them.
  const inputsSatisfied = isMulti
    ? filledSlots.length >= minImages &&
      !slots.some((s) => !s.optional && s.file === null && s.reused === null)
    : hasSource;
  const inputsPending =
    isMulti &&
    filledSlots.some(
      (s) =>
        s.status === "validating" ||
        s.status === "uploading" ||
        s.status === "finalizing" ||
        (!isAnonymous && s.status === "local")
    );
  const inputsFailed =
    isMulti &&
    slots.some((s) => s.status === "failed" || s.status === "blocked");
  const inputsReady = isMulti
    ? inputsSatisfied &&
      !inputsPending &&
      !inputsFailed &&
      (isAnonymous || filledSlots.every((s) => s.assetId !== null))
    : hasSource;

  // A confirmation or top-up surface only ever shows the price it was
  // opened with — the moment the configured inputs drift from that quote
  // it closes rather than silently repricing an open consent surface. It
  // also closes when a fresh quote for the *same* fingerprint lands with a
  // different amount — consent must name the price it approved.
  const landedCost = pricingStatus === "ready" ? displayCost : null;
  if (
    confirmQuote &&
    (confirmQuote.fingerprint !== quoteFingerprint ||
      (landedCost !== null && landedCost !== confirmQuote.credits))
  ) {
    setConfirmQuote(null);
  }
  if (
    insufficientQuote &&
    (insufficientQuote.fingerprint !== quoteFingerprint ||
      (landedCost !== null && landedCost !== insufficientQuote.credits))
  ) {
    setInsufficientQuote(null);
  }

  const outputSizes = useMemo(
    () =>
      product.output_sizes?.length
        ? product.output_sizes
        : ([{
            name: "Square (1:1)",
            width: 1024,
            height: 1024,
            is_default: true,
          }] as OutputSizeOption[]),
    [product.output_sizes]
  );

  // ── Family variant switching (#180) ─────────────────────────────────
  // The current setup as a carry-draft: uploaded inputs keep their asset
  // ids (they ride the URL — no re-upload), staged files get stable local
  // keys so the assessment can still sort/assign/drop them correctly.
  const variantDraftImages = useMemo(() => {
    const images: { assetId: string; role: string | null }[] = [];
    if (isMulti) {
      for (const s of filledSlots) {
        images.push({
          assetId:
            s.assetId ??
            s.reused?.assetId ??
            `local:${s.file?.name ?? s.id}:${s.file?.size ?? 0}`,
          role: s.role,
        });
      }
    } else if (hasSource) {
      images.push({
        assetId:
          reusedSource?.assetId ??
          `local:${file?.name ?? "staged"}:${file?.size ?? 0}`,
        role: null,
      });
    }
    return images;
  }, [isMulti, filledSlots, hasSource, reusedSource, file]);
  /** Same keys as `variantDraftImages` → the staged File or finalized
   *  asset behind each ref, used to split carried inputs between the
   *  ?inputs URL and the IndexedDB draft. */
  const variantSources = useMemo(() => {
    const map = new Map<
      string,
      { assetId: string | null; file: File | null }
    >();
    if (isMulti) {
      for (const s of filledSlots) {
        const assetId = s.assetId ?? s.reused?.assetId ?? null;
        const key =
          assetId ?? `local:${s.file?.name ?? s.id}:${s.file?.size ?? 0}`;
        map.set(key, { assetId, file: s.file });
      }
    } else if (hasSource) {
      const assetId = reusedSource?.assetId ?? null;
      const key =
        assetId ?? `local:${file?.name ?? "staged"}:${file?.size ?? 0}`;
      map.set(key, { assetId, file });
    }
    return map;
  }, [isMulti, filledSlots, hasSource, reusedSource, file]);
  const variantDraft = useMemo(
    () => ({ images: variantDraftImages, prompt: submitPrompt || null }),
    [variantDraftImages, submitPrompt]
  );
  /** The capability a sibling can *actually* honor today: admin flags are
   *  preconditions, but while a public release gate is off the assessment
   *  must explain the degraded reality rather than the configured ideal —
   *  an unreleased multi target only takes one image, an unreleased
   *  prompt capability can't apply saved text. */
  const effectiveCapability = useCallback(
    (
      cap: PublicInputCapability | null | undefined
    ): PublicInputCapability | null =>
      cap == null
        ? null
        : {
            ...cap,
            max_images: multiInputReleased
              ? cap.max_images
              : Math.min(cap.max_images, 1),
            prompt: {
              enabled: promptReleased && cap.prompt.enabled,
              max_chars: cap.prompt.max_chars,
            },
          },
    [multiInputReleased, promptReleased]
  );
  /** Per-chip draft-compat explanation — Engineer 3's `noticeFor` slot. */
  const variantNoticeFor = useCallback(
    (member: FamilyRailMember) => {
      if (!member.available || member.productId === product.id) return null;
      const { notices } = assessVariantSwitch(
        effectiveCapability(member.inputCapability),
        variantDraft
      );
      return notices.length > 0 ? notices.join(" · ") : null;
    },
    [effectiveCapability, product.id, variantDraft]
  );
  const [variantSwitching, setVariantSwitching] = useState(false);
  /** Switch: assess the carry, persist a draft the target restores via
   *  ?draft=1 (files, options, size, prompt, notices), hand already-
   *  uploaded assets through ?inputs/?roles, then navigate. The target
   *  page is a fresh form — its own quote lifecycle reprices the new
   *  version and no consent surface or charge can ride across. */
  const handleVariantSelect = useCallback(
    (member: FamilyRailMember, navigate: (href: string) => void) => {
      if (variantSwitching || !member.available) return;
      const result = assessVariantSwitch(
        effectiveCapability(member.inputCapability),
        variantDraft
      );
      setVariantSwitching(true);
      const carriedIds: string[] = [];
      const carriedRoles: string[] = [];
      const draftFiles: StudioDraftFile[] = [];
      for (const img of result.images) {
        const src = variantSources.get(img.assetId);
        if (!src) continue;
        if (src.assetId) {
          carriedIds.push(src.assetId);
          carriedRoles.push(img.role ?? "");
        } else if (src.file) {
          draftFiles.push({
            blob: src.file,
            name: src.file.name,
            type: src.file.type,
            role: img.role,
          });
        }
      }
      void (async () => {
        const saved = await saveStudioDraft({
          slug: member.slug,
          familyId: product.family_id ?? product.id,
          files: draftFiles,
          options,
          sizeName: selectedSize.name ?? null,
          // Preserved even when the target can't apply it — the target's
          // prompt gate decides application; the text is never discarded.
          prompt: variantDraft.prompt,
          notices: result.notices.length > 0 ? result.notices : undefined,
        });
        if (!saved && draftFiles.length > 0) {
          // The staged files are the only copy — losing them to a dead-end
          // navigation is worse than staying put with a warning.
          setVariantSwitching(false);
          setDraftSaveWarning(true);
          return;
        }
        const params = new URLSearchParams({ draft: "1" });
        if (carriedIds.length > 0) {
          params.set("inputs", carriedIds.join(","));
          params.set("roles", carriedRoles.join(","));
        }
        navigate(`/app/create/${member.slug}?${params.toString()}`);
      })();
    },
    [
      variantSwitching,
      effectiveCapability,
      variantDraft,
      variantSources,
      product.family_id,
      product.id,
      options,
      selectedSize.name,
    ]
  );

  const previewUrl = isMulti
    ? (focusedSlot?.previewUrl ?? null)
    : (objectUrl ?? reusedSource?.url ?? null);

  // Revoke the previous object URL when it is replaced or on unmount.
  useEffect(() => {
    if (!objectUrl) return;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  // Multi slots own their object URLs — revoke any blob: URL on unmount.
  const slotsRef = useRef(slots);
  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);
  useEffect(() => {
    return () => {
      for (const s of slotsRef.current) {
        if (s.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(s.previewUrl);
        }
      }
    };
  }, []);

  // Decode the preview once to learn the photo's real dimensions. A decode
  // failure means the format slipped past the type check — tell the user
  // instead of leaving an invisible preview. (Single-image path only —
  // multi slots decode per-slot below.)
  useEffect(() => {
    if (isMulti || !previewUrl) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const applyDims = (dims: { width: number; height: number }) => {
      if (cancelled || dims.width <= 0 || dims.height <= 0) return;
      setSourceDims(dims);
      const verdict = classifySourceDimensions(dims);
      setSourceWarning(
        verdict.class === "warning" ? (verdict.message ?? "") : ""
      );
    };

    const fail = () => {
      if (cancelled) return;
      setSourceDims(null);
      setFile(null);
      setObjectUrl(null);
      setSourceError(
        "We couldn't read that photo — try a different image."
      );
    };

    // <img> decode on the blob URL, retried — Chrome on Android
    // intermittently fails the first decode of gallery-picked files
    // (content://-backed blobs), and a retry resolves it.
    const img = new window.Image();
    let retries = 0;
    img.onload = () =>
      applyDims({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => {
      if (cancelled) return;
      if (retries < 2) {
        retries += 1;
        retryTimer = setTimeout(() => {
          if (!cancelled) img.src = previewUrl;
        }, 250);
        return;
      }
      fail();
    };

    // Picked files decode via createImageBitmap first — a separate decoder
    // path that survives the blob-URL failures. Reused sources (signed
    // URLs) use the <img> path directly.
    if (file && typeof createImageBitmap === "function") {
      createImageBitmap(file)
        .then((bmp) => {
          if (cancelled) {
            bmp.close();
            return;
          }
          const dims = { width: bmp.width, height: bmp.height };
          bmp.close();
          applyDims(dims);
        })
        .catch(() => {
          if (!cancelled) img.src = previewUrl;
        });
    } else {
      img.src = previewUrl;
    }

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [previewUrl, file, isMulti]);

  // Multi-image slot pipelines (#178): picked files decode per-slot into
  // `local`, then upload-on-select finalizes them into owned assets for
  // authenticated users — the charged submit then just hands the ordered
  // asset ids over. Anonymous visitors hold validated Blobs until the auth
  // round trip, when the same effect runs them through upload.
  const slotPipelineRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isMulti) return;

    // Stage 1 — decode picked files into dims + local readiness.
    for (const slot of slots) {
      if (
        slot.status !== "validating" ||
        !slot.file ||
        slotPipelineRef.current.has(`decode:${slot.id}`)
      ) {
        continue;
      }
      slotPipelineRef.current.add(`decode:${slot.id}`);
      const file = slot.file;
      void decodeImageDims(file).then((dims) => {
        slotPipelineRef.current.delete(`decode:${slot.id}`);
        setSlots((prev) =>
          prev.map((s) => {
            if (s.id !== slot.id || s.file !== file) return s;
            if (!dims) {
              return {
                ...s,
                status: "blocked",
                error:
                  "We couldn't read that photo — try a different image.",
              };
            }
            const verdict = classifySourceDimensions(dims);
            return {
              ...s,
              dims,
              status: "local",
              warning:
                verdict.class === "warning"
                  ? (verdict.message ?? "")
                  : null,
            };
          })
        );
      });
    }

    // Stage 2 — decode dims for reused/carried assets (signed URLs) so
    // match_source pricing and quality warnings see real sizes too.
    for (const slot of slots) {
      if (
        slot.status !== "ready" ||
        !slot.reused ||
        slot.dims !== null ||
        slotPipelineRef.current.has(`url-dims:${slot.id}`)
      ) {
        continue;
      }
      slotPipelineRef.current.add(`url-dims:${slot.id}`);
      const url = slot.previewUrl;
      if (!url) continue;
      void decodeUrlDims(url).then((dims) => {
        slotPipelineRef.current.delete(`url-dims:${slot.id}`);
        if (!dims) return;
        setSlots((prev) =>
          prev.map((s) =>
            s.id === slot.id && s.dims === null ? { ...s, dims } : s
          )
        );
      });
    }

    // Stage 3 — authenticated upload-on-select: a `local` slot uploads its
    // held file and lands at `ready` with a server asset id.
    if (!isAnonymous) {
      for (const slot of slots) {
        if (
          slot.status !== "local" ||
          !slot.file ||
          slotPipelineRef.current.has(`upload:${slot.id}`)
        ) {
          continue;
        }
        slotPipelineRef.current.add(`upload:${slot.id}`);
        const file = slot.file;
        const uploadSlot = async () => {
          const fail = (message: string) =>
            setSlots((prev) =>
              prev.map((s) =>
                s.id === slot.id && s.file === file
                  ? { ...s, status: "failed", error: message }
                  : s
              )
            );
          try {
            setSlots((prev) =>
              prev.map((s) =>
                s.id === slot.id && s.file === file
                  ? { ...s, status: "uploading" }
                  : s
              )
            );
            const { signedUrl, path } = await prepareSourceUpload(
              file.type,
              file.size
            );
            await uploadSourceToSignedUrl(signedUrl, file);
            setSlots((prev) =>
              prev.map((s) =>
                s.id === slot.id && s.file === file
                  ? { ...s, status: "finalizing" }
                  : s
              )
            );
            const finalized = await finalizeSourceUpload(
              path,
              file.type,
              file.size
            );
            setSlots((prev) =>
              prev.map((s) =>
                s.id === slot.id && s.file === file
                  ? {
                      ...s,
                      status: "ready",
                      assetId: finalized.assetId,
                      error: null,
                    }
                  : s
              )
            );
          } catch (err) {
            fail(
              err instanceof Error
                ? err.message
                : "Upload failed — try again."
            );
          } finally {
            slotPipelineRef.current.delete(`upload:${slot.id}`);
          }
        };
        void uploadSlot();
      }
    }
  }, [isMulti, isAnonymous, slots]);

  const presetThumb = useMemo(() => {
    const asset =
      product.public_assets?.find((a) => a.role === "hero") ??
      product.public_assets?.[0];
    if (!asset) return null;
    return publicAssetUrl(asset.bucket, asset.storage_key);
  }, [product.public_assets]);

  // Restore a staged draft after the auth round trip (?draft=1). A family-id
  // match also restores — a sibling-variant switch keeps the staged photos
  // (#178), and extras beyond the target's capacity are reported, not
  // silently dropped.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("draft") !== "1") return;
    let cancelled = false;

    void loadStudioDraft(
      product.slug,
      product.family_id ?? product.id
    ).then((draft) => {
      if (cancelled || !draft) return;
      const files = draft.files.map(
        (f) => new File([f.blob], f.name, { type: f.type })
      );
      let droppedNotice = "";

      if (isMulti) {
        // Role-aware placement (#180): draft files carry the role the
        // switch-time assessment resolved for this variation, so each lands
        // on its named slot — never on a slot a carried ?inputs asset
        // already filled. This effect fires once at mount, so placing
        // against the render-scope slots is deterministic; overflow is
        // counted for the notice, not lost.
        const next = [...slots];
        let overflow = 0;
        draft.files.forEach((draftFile, i) => {
          const restored = files[i]!;
          let idx = draftFile.role
            ? next.findIndex(
                (s) =>
                  s.role === draftFile.role &&
                  s.file === null &&
                  s.reused === null
              )
            : -1;
          if (idx < 0) {
            idx = next.findIndex(
              (s) => s.file === null && s.reused === null
            );
          }
          if (idx < 0) {
            overflow++;
            return;
          }
          next[idx] = {
            ...blankSlot(next[idx]!),
            status: "validating",
            file: restored,
            previewUrl: URL.createObjectURL(restored),
          };
        });
        setSlots(next);
        if (overflow > 0) {
          droppedNotice =
            overflow === 1
              ? "1 photo wasn't needed for this look."
              : `${overflow} photos weren't needed for this look.`;
        }
        setFocusedSlotId("slot-0");
      } else {
        const restored = files[0];
        if (restored) {
          setFile(restored);
          setObjectUrl(URL.createObjectURL(restored));
          setReusedSource(null);
        }
      }
      // Switch-time explanations (#180) — what carried, what the target
      // can't take, what it still needs. Shown on either input path.
      const notices = [...(draft.notices ?? [])];
      if (droppedNotice) notices.push(droppedNotice);
      if (notices.length > 0) setInputsNotice(notices.join(" "));
      setDraftRestored(true);
      setOptions((prev) => ({ ...prev, ...draft.options }));
      // Saved prompt only applies when this preset can take it — a sibling
      // variant without the capability gets an explanation, not silence.
      const savedPrompt = draft.prompt?.trim() ?? "";
      if (savedPrompt && promptAllowed) {
        setPromptText(savedPrompt);
        setPromptOn(true);
      } else if (savedPrompt) {
        setPromptNotice("Your saved changes text isn't used by this look.");
      }
      if (draft.sizeName) {
        const match = product.output_sizes?.find(
          (s) => s.name === draft.sizeName
        );
        if (match) setSelectedSize(match);
      }
      params.delete("draft");
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${qs ? `?${qs}` : ""}`
      );
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.slug]);

  // Anonymous setups persist to IndexedDB so the auth redirect can't lose
  // them. If the write fails (private mode / quota) we say so rather than
  // silently implying the setup was saved.
  useEffect(() => {
    // A variant switch owns the draft slot until it navigates — an in-flight
    // autosave for the old slug could overwrite the switch draft (#180).
    if (!isAnonymous || variantSwitching) return;
    const handle = setTimeout(() => {
      const draftFiles = isMulti
        ? filledSlots
            .filter((s) => s.file)
            .map((s) => ({
              blob: s.file!,
              name: s.file!.name,
              type: s.file!.type,
              role: s.role,
            }))
        : file
          ? [{ blob: file, name: file.name, type: file.type, role: null }]
          : [];
      if (draftFiles.length === 0) return;
      void saveStudioDraft({
        slug: product.slug,
        familyId: product.family_id ?? product.id,
        files: draftFiles,
        options,
        sizeName: selectedSize.name ?? null,
        prompt: submitPrompt || null,
      }).then((ok) => setDraftSaveWarning(!ok));
    }, 400);
    return () => clearTimeout(handle);
  }, [
    isAnonymous,
    variantSwitching,
    isMulti,
    filledSlots,
    file,
    options,
    selectedSize,
    submitPrompt,
    product.slug,
    product.id,
    product.family_id,
  ]);

  /** Last structural key a quote fetch was scheduled for — prompt-only
   *  changes against the same structure settle for 350ms rather than
   *  hitting the estimator per keystroke. */
  const lastQuoteStructural = useRef<string | null>(null);

  useEffect(() => {
    // Anonymous visitors can't hold a quote — the server won't price a
    // session that doesn't exist. Pricing only gates the charged submit,
    // which anonymous users can't reach (the auth gate intercepts first).
    const versionId = product.version_id;
    if (isAnonymous || !versionId || dimsPending) return;
    const fingerprint = quoteFingerprint;
    // Prompt typing still invalidates instantly (fingerprint moves), but
    // the *fetch* settles — size/input changes fetch right away as before.
    const promptOnly = lastQuoteStructural.current === structuralKey;
    lastQuoteStructural.current = structuralKey;
    let cancelled = false;

    const fetchQuote = () => {
      void estimateGenerationCost({
        productVersionId: versionId,
        outputSize: estimateSize,
      })
        .then(({ estimatedCredits, unavailable }) => {
          if (cancelled) return;
          // Fail closed: missing or non-positive pricing is unquotable,
          // never free — zero would bypass confirmation and misstate consent.
          setPriceQuote(
            !unavailable && estimatedCredits > 0
              ? { status: "ready", credits: estimatedCredits, fingerprint }
              : { status: "unavailable", credits: null, fingerprint }
          );
        })
        .catch(() => {
          if (!cancelled) {
            setPriceQuote({ status: "failed", credits: null, fingerprint });
          }
        });
    };

    if (!promptOnly) {
      fetchQuote();
      return () => {
        cancelled = true;
      };
    }
    const timer = setTimeout(fetchQuote, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    isAnonymous,
    product.version_id,
    dimsPending,
    estimateSize,
    quoteFingerprint,
    structuralKey,
    priceRetryKey,
  ]);

  const handleFileSelected = useCallback((selected: File | null) => {
    setError("");
    setSourceError("");
    setSourceWarning("");
    setUploadFailed(false);
    setDraftRestored(false);
    setSourceDims(null);
    if (!selected) {
      setFile(null);
      setObjectUrl(null);
      return;
    }
    const verdict = classifySourceFile(selected);
    if (verdict.class === "rejected") {
      setSourceError(verdict.message ?? "That photo can't be used.");
      setFile(null);
      setObjectUrl(null);
      return;
    }
    setReusedSource(null);
    setFile(selected);
    setObjectUrl(URL.createObjectURL(selected));
  }, []);

  const handleClearSource = useCallback(() => {
    setFile(null);
    setObjectUrl(null);
    setReusedSource(null);
    setSourceDims(null);
    setSourceError("");
    setSourceWarning("");
    setUploadFailed(false);
    setDraftRestored(false);
  }, []);

  // ---- Multi-image slot handlers (#178) ---------------------------------
  // The first picked file lands on the targeted slot (replace); extras fill
  // the next dead/empty slots in order — files beyond capacity are counted
  // and reported, never silently dropped.
  const handleSlotPick = useCallback((slotId: string, files: File[]) => {
    setError("");
    setDraftRestored(false);
    setInputsNotice("");
    let overflow = 0;
    setSlots((prev) => {
      const next = [...prev];
      const taken = new Set(
        next
          .filter((s) => s.file)
          .map((s) => `${s.file!.name}:${s.file!.size}`)
      );
      let first = true;
      for (const picked of files) {
        const idx = first
          ? next.findIndex((s) => s.id === slotId)
          : next.findIndex(
              (s) =>
                s.status === "empty" ||
                s.status === "blocked" ||
                s.status === "failed"
            );
        if (idx === -1) {
          overflow += 1;
          continue;
        }
        first = false;
        const slot = next[idx]!;
        if (slot.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(slot.previewUrl);
        }
        const key = `${picked.name}:${picked.size}`;
        if (taken.has(key)) {
          next[idx] = {
            ...blankSlot(slot),
            status: "blocked",
            error: "That photo is already added.",
          };
          continue;
        }
        const verdict = classifySourceFile(picked);
        if (verdict.class === "rejected") {
          next[idx] = {
            ...blankSlot(slot),
            status: "blocked",
            error: verdict.message ?? "That photo can't be used.",
          };
          continue;
        }
        taken.add(key);
        next[idx] = {
          ...blankSlot(slot),
          status: "validating",
          file: picked,
          previewUrl: URL.createObjectURL(picked),
        };
      }
      return next;
    });
    if (overflow > 0) {
      setInputsNotice(
        `This look takes up to ${buildInputSlots(product).length} photos — ${overflow} extra ${overflow === 1 ? "was" : "were"} left out.`
      );
    }
    setFocusedSlotId(slotId);
  }, [product]);

  const handleSlotRemove = useCallback((slotId: string) => {
    setDraftRestored(false);
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        if (s.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(s.previewUrl);
        }
        return blankSlot(s);
      })
    );
  }, []);

  const handleSlotRetry = useCallback((slotId: string) => {
    // A failed upload holds its file — dropping back to `local` re-enters
    // the upload pipeline; successful slots are never re-uploaded.
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId && s.status === "failed" && s.file
          ? { ...s, status: "local", error: null }
          : s
      )
    );
  }, []);

  /** A reorder only swaps content between slots that share a declared role
   *  (or both have none) — role identity stays positional so a reorder can
   *  never silently reassign subject ↔ reference. */
  const canMoveSlot = useCallback(
    (slotId: string, dir: -1 | 1) => {
      const i = slots.findIndex((s) => s.id === slotId);
      const j = i + dir;
      if (i === -1 || j < 0 || j >= slots.length) return false;
      const a = slots[i]!;
      const b = slots[j]!;
      return a.role === b.role && (a.file !== null || a.reused !== null);
    },
    [slots]
  );

  const handleSlotMove = useCallback((slotId: string, dir: -1 | 1) => {
    setSlots((prev) => {
      const i = prev.findIndex((s) => s.id === slotId);
      const j = i + dir;
      if (
        i === -1 ||
        j < 0 ||
        j >= prev.length ||
        prev[i]!.role !== prev[j]!.role
      ) {
        return prev;
      }
      const pick = (s: InputSlot) => ({
        status: s.status,
        file: s.file,
        reused: s.reused,
        previewUrl: s.previewUrl,
        dims: s.dims,
        assetId: s.assetId,
        error: s.error,
        warning: s.warning,
      });
      const next = [...prev];
      const a = next[i]!;
      const b = next[j]!;
      next[i] = { ...a, ...pick(b) };
      next[j] = { ...b, ...pick(a) };
      return next;
    });
  }, []);

  // Stage dropzone routes to the focused slot when it's staged (replace),
  // otherwise the first dead/empty slot.
  const handleStageFile = useCallback(
    (selected: File | null) => {
      if (!isMulti) {
        handleFileSelected(selected);
        return;
      }
      if (!selected) {
        if (focusedSlot) handleSlotRemove(focusedSlot.id);
        return;
      }
      const target =
        focusedSlot && (focusedSlot.file || focusedSlot.reused)
          ? focusedSlot
          : (slots.find(
              (s) =>
                s.status === "empty" ||
                s.status === "blocked" ||
                s.status === "failed"
            ) ?? focusedSlot);
      if (target) handleSlotPick(target.id, [selected]);
    },
    [isMulti, focusedSlot, slots, handleFileSelected, handleSlotPick, handleSlotRemove]
  );

  const handleStageClear = useCallback(() => {
    if (!isMulti) {
      handleClearSource();
      return;
    }
    if (focusedSlot) handleSlotRemove(focusedSlot.id);
  }, [isMulti, focusedSlot, handleClearSource, handleSlotRemove]);

  const handleSubmit = (e: React.FormEvent) => {
    // The AuthModal Sheet portals to document.body but stays in this React
    // tree, so its form submits bubble here — ignore events not from this
    // form or the sheet's submit gets preventDefault'd and silently dies.
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    setError("");
    setProgress("");
    setUploadFailed(false);

    if (!hasSource || (isMulti && !inputsSatisfied)) {
      setError(
        minImages > 1
          ? `This look needs ${minImages} photos — add them to get started.`
          : "Add a photo to get started."
      );
      return;
    }
    if (isMulti && (inputsPending || inputsFailed)) {
      setError(
        inputsFailed
          ? "Fix or remove the flagged photo to continue."
          : "Photos are still uploading — try again in a moment."
      );
      return;
    }
    if (!product.version_id) {
      setError("This look isn't available right now.");
      return;
    }
    if (generationPaused) {
      return;
    }
    // Over-length prompt never submits — the counter/error live in the
    // composer; this is the backstop for programmatic paths.
    if (promptOver) {
      setPromptError(`Keep it under ${promptMaxChars} characters.`);
      return;
    }

    const validation = validateGenerationOptions(
      product.active_fields,
      options
    );
    if (validation) {
      setError(validation.message);
      return;
    }

    // Deferred auth: anonymous setups are fully prepared first — the account
    // prompt only appears at the moment of intent.
    if (isAnonymous) {
      const draftFiles = isMulti
        ? filledSlots
            .filter((s) => s.file)
            .map((s) => ({
              blob: s.file!,
              name: s.file!.name,
              type: s.file!.type,
              role: s.role,
            }))
        : file
          ? [{ blob: file, name: file.name, type: file.type, role: null }]
          : [];
      void saveStudioDraft({
        slug: product.slug,
        familyId: product.family_id ?? product.id,
        files: draftFiles,
        options,
        sizeName: selectedSize.name ?? null,
        prompt: submitPrompt || null,
      }).then((ok) => setDraftSaveWarning(!ok));
      setAuthGateOpen(true);
      return;
    }

    // Fail closed: a charged submit needs a fresh server quote for the
    // exact inputs on screen. No quote, no action — never a zero fallback.
    if (
      priceQuote?.status !== "ready" ||
      priceQuote.fingerprint !== quoteFingerprint ||
      priceQuote.credits === null
    ) {
      return;
    }
    const cost = priceQuote.credits;

    if (initialBalance < cost) {
      setInsufficientQuote({ credits: cost, fingerprint: quoteFingerprint });
      return;
    }

    let skipPreference = false;
    try {
      skipPreference =
        localStorage.getItem(SKIP_COST_CONFIRM_KEY) === "1";
    } catch {
      // storage unavailable — treat as not skipped
    }

    if (
      shouldConfirmCost({
        cost,
        hasPriorGenerations,
        skipPreference,
      })
    ) {
      setConfirmQuote({ credits: cost, fingerprint: quoteFingerprint });
      return;
    }

    startRun();
  };

  /** Fire the charged run without leaving a floating rejection — server
   *  action redirects resolve through the action response itself, so a
   *  NEXT_REDIRECT surfacing here is a transport artifact, not a failure. */
  const startRun = () => {
    void runGeneration().catch(() => {});
  };

  const runGeneration = async () => {
    // The charged path re-verifies the quote before any work — the confirm
    // dialog and the upload-retry both land here, and inputs may have
    // changed since the quote resolved.
    if (
      !isAnonymous &&
      (priceQuote?.status !== "ready" ||
        priceQuote.fingerprint !== quoteFingerprint ||
        priceQuote.credits === null)
    ) {
      return;
    }
    // Multi-image submits need every staged input finalized — a slot still
    // uploading or failed can never become part of the payload silently.
    if (
      isMulti &&
      !isAnonymous &&
      !filledSlots.every((s) => s.assetId !== null)
    ) {
      return;
    }
    setLoading(true);

    try {
      let sourceAssetId = reusedSource?.assetId ?? null;

      if (!isMulti && file) {
        try {
          setProgress("Preparing secure upload...");
          const { signedUrl, path } = await prepareSourceUpload(
            file.type,
            file.size
          );

          setProgress("Uploading image...");
          await uploadSourceToSignedUrl(signedUrl, file);

          setProgress("Finalizing upload...");
          const finalized = await finalizeSourceUpload(
            path,
            file.type,
            file.size
          );
          sourceAssetId = finalized.assetId;
        } catch (err) {
          // The file object is still held — a retry skips re-picking.
          setUploadFailed(true);
          throw err;
        }
      }

      if (!isMulti && !sourceAssetId) {
        throw new Error("Add a photo to get started.");
      }

      setProgress("Starting generation...");
      const idempotencyKey = `create:${userId}:${product.id}:${uuidv4()}`;
      const result = await createAndSubmitGeneration({
        productId: product.id,
        productVersionId: product.version_id ?? "",
        ...(isMulti
          ? {
              inputs: filledSlots.map((s) => ({
                assetId: s.assetId!,
                role: s.role ?? undefined,
              })),
            }
          : { sourceAssetId: sourceAssetId ?? undefined }),
        options,
        outputSize: selectedSize,
        idempotencyKey,
        // Contract-shaped prompt — only prompt-eligible presets ever send
        // it; the server still composes/moderates it against the recipe.
        ...(submitPrompt ? { prompt: submitPrompt } : {}),
      });

      if (result?.error) {
        // Session-expired mid-flow → reopen the auth sheet in place; the
        // draft is still in IndexedDB so one tap resumes after re-auth.
        if (result.error === "Please sign in to continue.") {
          const draftFiles = isMulti
            ? filledSlots
                .filter((s) => s.file)
                .map((s) => ({
                  blob: s.file!,
                  name: s.file!.name,
                  type: s.file!.type,
                  role: s.role,
                }))
            : file
              ? [
                  {
                    blob: file,
                    name: file.name,
                    type: file.type,
                    role: null,
                  },
                ]
              : [];
          if (draftFiles.length > 0) {
            void saveStudioDraft({
              slug: product.slug,
              familyId: product.family_id ?? product.id,
              files: draftFiles,
              options,
              sizeName: selectedSize.name ?? null,
              prompt: submitPrompt || null,
            });
          }
          setAuthGateOpen(true);
        } else if (submitPrompt && result.error.includes("content policy")) {
          // A prompt moderation block belongs on the composer — revise the
          // text and Generate again; the setup (photos/options) is untouched.
          setPromptError(result.error);
        } else {
          setError(result.error);
        }
      }
      // On success the server action redirects. On idempotent retry it also redirects.
    } catch (err) {
      if (
        err instanceof Error &&
        ((err as { digest?: string }).digest === "NEXT_REDIRECT" ||
          err.message === "NEXT_REDIRECT")
      ) {
        // Redirect-confirmed success — only now is the staged draft consumed.
        // Clearing any earlier would wipe the recovery copy on a failed run.
        void clearStudioDraft();
        throw err;
      }
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const retryPricing = useCallback(() => {
    setPriceQuote({
      status: "loading",
      credits: null,
      fingerprint: quoteFingerprint,
    });
    setPriceRetryKey((k) => k + 1);
  }, [quoteFingerprint]);

  const stepIndex = submitStepIndex(progress);
  const creditUnit = displayCost === 1 ? "credit" : "credits";
  const generateLabel =
    displayCost !== null
      ? `Generate · ${displayCost} ${creditUnit}`
      : "Generate";
  // Anonymous visitors aren't gated on price — they can't be charged, so
  // their Generate opens the auth sheet instead.
  const generateDisabled =
    loading ||
    !inputsReady ||
    generationPaused ||
    !online ||
    promptOver ||
    (!isAnonymous && !pricingReady);
  // Every disabled state names its blocker; while submitting, the reason
  // line doubles as honest progress. Pricing failures carry a retry.
  const disabledReason: ReactNode = loading
    ? progress || "Starting…"
    : !inputsSatisfied
      ? minImages > 1
        ? `This look needs ${minImages} photos`
        : "Add a photo to generate"
      : generationPaused
        ? "Generation is paused — try again shortly"
        : !online
          ? "You're offline — reconnect to generate"
          : inputsFailed
            ? "Fix or remove the flagged photo to continue"
            : inputsPending
              ? "Photos are still uploading…"
              : promptOver
                ? `Keep your changes under ${promptMaxChars} characters`
              : !isAnonymous && !pricingReady
            ? pricingStatus === "loading" ? (
                "Checking the current price…"
              ) : (
                <span className="inline-flex items-center gap-2">
                  {pricingStatus === "failed"
                    ? "Couldn't load the price."
                    : "This look can't be priced right now."}
                  <button
                    type="button"
                    onClick={retryPricing}
                    className="text-lime-400 font-semibold underline underline-offset-2"
                  >
                    Retry
                  </button>
                </span>
              )
            : undefined;

  const submitError = error ? (
    <div className="bg-error/10 text-error mb-3 flex items-start gap-2 rounded-md px-3 py-2 text-xs">
      <Warning size={14} weight="fill" className="mt-0.5 shrink-0" />
      <p className="flex-1">{error}</p>
      {uploadFailed && file ? (
        <button
          type="button"
          onClick={() => startRun()}
          className="shrink-0 font-semibold underline underline-offset-2"
        >
          Retry upload
        </button>
      ) : null}
    </div>
  ) : null;

  const generateButton = (
    <Button
      type="submit"
      variant="brand"
      size="lg"
      className="w-full"
      disabled={generateDisabled}
    >
      {loading ? (
        <>
          <CircleNotch size={18} weight="bold" className="animate-spin" />
          Generating…
        </>
      ) : (
        generateLabel
      )}
    </Button>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col lg:flex-row">
      {/* Configuration rail */}
      <aside className="border-cream-100/10 order-last flex w-full shrink-0 flex-col lg:order-first lg:max-h-full lg:w-[340px] lg:overflow-y-auto lg:border-r xl:w-[370px]">
        <div className="flex-1 space-y-6 px-4 py-6 sm:px-5">
          {draftRestored && (
            <p
              role="status"
              className="bg-lime-400/10 text-lime-300 flex items-center gap-2 rounded-md px-3 py-2 text-[13px]"
            >
              <Check size={14} weight="bold" className="shrink-0" />
              We kept your photo and settings.
            </p>
          )}
          {inputsNotice && (
            <p
              role="status"
              className="bg-warning/10 text-warning flex items-center gap-2 rounded-md px-3 py-2 text-[13px]"
            >
              <Warning size={14} weight="fill" className="shrink-0" />
              {inputsNotice}
            </p>
          )}
          {draftSaveWarning && (
            <p
              role="status"
              className="bg-warning/10 text-warning flex items-center gap-2 rounded-md px-3 py-2 text-[13px]"
            >
              <Warning size={14} weight="fill" className="shrink-0" />
              We couldn&rsquo;t save your setup — keep this tab open until you
              sign in.
            </p>
          )}

          {/* Preset context card */}
          <div className="shadow-border flex items-center gap-3 rounded-lg bg-charcoal-800/80 p-3">
            {presetThumb ? (
              <div className="media-frame relative h-14 w-14 shrink-0 overflow-hidden rounded-md">
                <Image
                  src={presetThumb}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="media-frame flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-charcoal-700">
                <Sparkle size={20} weight="fill" className="text-lime-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-cream-50 truncate text-sm font-semibold">
                {product.name}
              </p>
              <p className="text-text-muted text-xs capitalize">
                {product.type} look
              </p>
            </div>
            <Link
              href="/explore"
              className="text-text-secondary hover:text-lime-400 flex shrink-0 items-center gap-1 text-xs font-medium transition-colors"
            >
              Change
              <ArrowRight size={12} weight="bold" />
            </Link>
          </div>

          {/* Sibling variations (#180) — browse/switch before generating.
              Chips explain what the draft can't carry; selection assesses
              compatibility, preserves the setup in a draft, and hands
              uploaded assets across without a re-upload. */}
          {family.length > 1 && (
            <VariantSwitchRail
              members={family}
              currentProductId={product.id}
              noticeFor={variantNoticeFor}
              onSwitch={handleVariantSelect}
            />
          )}

          {/* Source status line — the stage carries this on mobile. */}
          <div className="hidden md:block">
            <p className="text-text-muted mb-2 text-[11px] font-semibold uppercase tracking-wide">
              Source
            </p>
            {hasSource ? (
              <p className="text-text-secondary flex items-center gap-2 text-[13px]">
                <span className="bg-lime-400 h-1.5 w-1.5 shrink-0 rounded-full" />
                <span className="truncate">
                  {isMulti
                    ? `${filledSlots.length} of ${slots.length} photos added`
                    : (file?.name ?? reusedSource?.name ?? "Photo added")}
                </span>
              </p>
            ) : (
              <p className="text-text-muted text-[13px]">
                No photo yet — add one in the workspace.
              </p>
            )}
          </div>

          {/* Prompt — opt-in, admin-enabled per preset (#182). The legacy
              GenerationControls panel is retired; saved option data still
              reads back on legacy result adjusts. */}
          {(promptAllowed || promptNotice) && (
            <div>
              <div className="mb-2.5 flex items-baseline justify-between">
                <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wide">
                  Prompt
                </p>
                {!hasSource && (
                  <span className="text-text-muted text-[11px]">
                    Add a photo first
                  </span>
                )}
              </div>
              {promptAllowed ? (
                <PresetPromptComposer
                  enabled={promptOn}
                  value={promptText}
                  maxChars={promptMaxChars}
                  disabled={!hasSource || loading}
                  error={promptError || null}
                  onToggle={setPromptOn}
                  onChange={(v) => {
                    setPromptText(v);
                    if (promptError) setPromptError("");
                  }}
                />
              ) : (
                <p className="text-text-muted text-[12px]">{promptNotice}</p>
              )}
            </div>
          )}
          {isPoster && (
            <p className="text-text-muted text-[11px]">
              Posters include text rendered over the finished image.
            </p>
          )}

          {/* Output size */}
          <SettingTile label="Output size" disabled={loading}>
            <AspectRatioMenu
              sizes={outputSizes}
              selected={selectedSize}
              disabled={loading}
              onChange={setSelectedSize}
              sourceDims={sourceDims}
            />
          </SettingTile>
        </div>

        {/* Sticky generate console — desktop/tablet only; mobile gets the
            docked bar so there is exactly one fixed bottom element. */}
        <div className="border-cream-100/10 bg-charcoal-850/95 hidden border-t px-4 py-4 backdrop-blur sm:px-5 md:sticky md:bottom-0 md:block">
          {submitError}
          <div className="mb-3 flex items-baseline justify-between text-[13px]">
            <span className="text-text-secondary">Cost</span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                canAfford ? "text-cream-50" : "text-error"
              )}
            >
              {displayCost !== null ? `${displayCost} ${creditUnit}` : "—"}
            </span>
          </div>
          {!isAnonymous && (
            <div className="mb-3 flex items-baseline justify-between text-[13px]">
              <span className="text-text-secondary">Balance</span>
              <span
                className={cn(
                  "tabular-nums",
                  canAfford ? "text-text-secondary" : "text-error"
                )}
              >
                {initialBalance} {initialBalance === 1 ? "credit" : "credits"}
              </span>
            </div>
          )}
          {isAnonymous && (
            <p className="text-text-muted mb-3 text-[11px]">
              No account needed to prepare — sign in only when you generate.
            </p>
          )}
          {generationPaused && (
            <p
              role="status"
              className="text-text-secondary border-cream-100/10 bg-charcoal-800 mb-3 rounded-md border px-3 py-2 text-xs"
            >
              Transformations are temporarily paused. You can keep preparing —
              Generate will be back shortly.
            </p>
          )}
          {generateButton}
          {disabledReason && (
            <p className="text-text-muted mt-2 text-[13px]">{disabledReason}</p>
          )}
        </div>
      </aside>

      {/* Visual stage + multi-image rail (#178). Single-image presets keep
          the original one-photo experience — the rail only exists when the
          version's capability declares more than one input. */}
      <div className="flex min-h-0 flex-1 flex-col">
        <StudioStage
          previewUrl={previewUrl}
          sourceName={
            isMulti
              ? (focusedSlot?.file?.name ?? focusedSlot?.reused?.name ?? null)
              : (file?.name ?? reusedSource?.name ?? null)
          }
          sourceLabel={isMulti ? focusedSlot?.roleLabel : undefined}
          aspectRatio={
          selectedSize.match_source
            ? sourceDims
              ? sourceDims.width / sourceDims.height
              : null
            : selectedSize.width && selectedSize.height
              ? selectedSize.width / selectedSize.height
              : null
        }
          disabled={loading}
          submitting={loading}
          submitStepIndex={stepIndex}
          submitStepLabel={SUBMIT_STEPS[Math.min(stepIndex, 2)]}
          submitSteps={SUBMIT_STEPS}
          sourceError={
            isMulti
              ? (focusedSlot?.error ?? sourceError) || null
              : sourceError || null
          }
          sourceWarning={
            isMulti
              ? (focusedSlot?.warning ?? sourceWarning) || null
              : sourceWarning || null
          }
          onFileSelected={handleStageFile}
          onClear={handleStageClear}
        />
        {isMulti && (
          <PresetImageInputs
            slots={slots.map((s) => ({
              ...s,
              fileName: s.file?.name ?? s.reused?.name ?? null,
            }))}
            requiredCount={minImages}
            maxCount={slots.length}
            filledCount={filledSlots.length}
            focusedSlotId={focusedSlot?.id ?? null}
            disabled={loading}
            onPick={handleSlotPick}
            onRemove={handleSlotRemove}
            onRetry={handleSlotRetry}
            onFocus={setFocusedSlotId}
            onMove={handleSlotMove}
            canMove={canMoveSlot}
          />
        )}
      </div>

      {/* Mobile docked bar — the only fixed bottom element on this route. */}
      <div className="order-last md:hidden">
        <MobilePageBottomSpacer withDockedBar />
      </div>
      <DockedActionBar
        className="order-last"
        info={
          <>
            Cost {displayCost !== null ? `${displayCost} ${creditUnit}` : "—"}
            {!isAnonymous && <> · Balance {initialBalance}</>}
          </>
        }
        reason={disabledReason}
      >
        {submitError}
        {generateButton}
      </DockedActionBar>

      <CreditConfirmDialog
        open={
          confirmQuote !== null &&
          confirmQuote.fingerprint === quoteFingerprint
        }
        onOpenChange={(open) => {
          if (!open) setConfirmQuote(null);
        }}
        cost={confirmQuote?.credits ?? 0}
        balance={initialBalance}
        onConfirm={() => startRun()}
      />
      {blocked && (
        <BlockedCreditSurface
          open={
            insufficientQuote !== null &&
            insufficientQuote.fingerprint === quoteFingerprint
          }
          onOpenChange={(open) => {
            if (!open) setInsufficientQuote(null);
          }}
          segment={blocked.segment}
          offer={offer}
          plans={plans}
          required={insufficientQuote?.credits ?? 0}
          balance={initialBalance}
          presetName={product.name}
          presetThumbUrl={presetThumb}
          topUp={topUp}
          resumePlan={blocked.resumePlan}
          planEndsAt={blocked.planEndsAt}
          activePlanName={blocked.activePlanName}
          isReferred={blocked.isReferred}
          referralCode={referralCode}
        />
      )}
      {/* Anonymous setups autosave to IndexedDB (debounced above), so the auth
          sheet only needs the draft=1 return path — nothing to persist here. */}
      <AuthModal
        open={authGateOpen}
        onOpenChange={setAuthGateOpen}
        next={`/app/create/${product.slug}?draft=1`}
        preset={{ name: product.name, thumbUrl: presetThumb }}
        initialTab="signup"
      />
    </form>
  );
}
