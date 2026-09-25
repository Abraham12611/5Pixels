"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import {
  CLIENT_EVENTS,
  readAnonId,
  type ClientOfferEvent,
} from "./engine";

export interface OfferEventInput {
  campaignId: string;
  variant?: string;
  step?: number;
  surface: "takeover" | "paywall" | "ribbon" | "tile" | "blur_gate";
  event: ClientOfferEvent;
  context?: string;
  meta?: Record<string, unknown>;
}

/**
 * Validated event intake (09 §2): clients may only write CLIENT_EVENTS —
 * `converted`/`refunded` are reserved for the payment webhook. Events attach
 * to the signed-in user or the anon cookie id.
 */
export async function recordOfferEvent(
  input: OfferEventInput
): Promise<{ ok: boolean }> {
  if (!CLIENT_EVENTS.includes(input.event)) {
    return { ok: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const anonId = user ? null : await readAnonId();
  if (!user && !anonId) return { ok: false };

  const service = createServiceClient();
  const { error } = await service.from("promo_events").insert({
    user_id: user?.id ?? null,
    anon_id: anonId,
    campaign_id: input.campaignId,
    variant: input.variant ?? null,
    step: input.step ?? null,
    surface: input.surface,
    event: input.event,
    context: input.context ?? null,
    meta: (input.meta ?? {}) as Record<string, unknown>,
  });

  if (error) {
    console.error("[recordOfferEvent] insert failed", error.message);
    return { ok: false };
  }
  return { ok: true };
}

/**
 * Global promo opt-out (08 §4 `Don't show offers`): suppresses every
 * promotional surface; functional surfaces (insufficient-credits sheet)
 * survive.
 */
export async function optOutOffers(campaignId?: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const service = createServiceClient();
  await service
    .from("profiles")
    .update({ offers_opted_out: true })
    .eq("id", user.id);

  await service.from("promo_events").insert({
    user_id: user.id,
    campaign_id: campaignId ?? null,
    surface: "takeover",
    event: "opt_out",
  });
}
