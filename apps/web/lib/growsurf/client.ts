/**
 * GrowSurf REST API client (docs/growsurf/REST API.md).
 *
 * Server-only — GROWSURF_API_KEY is a bearer credential and must never
 * reach a client bundle. Every function no-ops (returns null/false) when
 * the integration is unconfigured so the first-party referral loop keeps
 * working standalone until credentials exist.
 *
 * Base URL: https://api.growsurf.com/v2 — auth: `Authorization: Bearer`.
 */

const BASE_URL = "https://api.growsurf.com/v2";
const REQUEST_TIMEOUT_MS = 10_000;

export function growSurfApiKey(): string | undefined {
  return process.env.GROWSURF_API_KEY?.trim() || undefined;
}

export function growSurfCampaignId(): string | undefined {
  return process.env.GROWSURF_CAMPAIGN_ID?.trim() || undefined;
}

export function isGrowSurfConfigured(): boolean {
  return Boolean(growSurfApiKey() && growSurfCampaignId());
}

/**
 * Days to hold referral credit before GrowSurf awards it (the program's
 * refund window). 0/absent = trigger immediately; our local ledger grants
 * right away and the webhook only reconciles. 1–90 = the reward row parks
 * in pending_hold until PARTICIPANT_REACHED_A_GOAL lands.
 */
export function growSurfReferralHoldDays(): number {
  const raw = process.env.GROWSURF_REFERRAL_HOLD_DAYS?.trim();
  if (!raw) return 0;
  const days = Number.parseInt(raw, 10);
  if (!Number.isFinite(days) || days < 1) return 0;
  return Math.min(days, 90);
}

interface GrowSurfError {
  code?: string;
  message?: string;
}

async function growSurfFetch<T>(
  path: (campaignId: string) => string,
  init: { method: string; body?: unknown }
): Promise<T | null> {
  const apiKey = growSurfApiKey();
  const campaignId = growSurfCampaignId();
  if (!apiKey || !campaignId) return null;

  const response = await fetch(`${BASE_URL}${path(campaignId)}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    // GrowSurf calls happen inside webhook/action handlers — never cache.
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = "";
    try {
      const err = (await response.json()) as GrowSurfError;
      detail = err.code ? `${err.code}: ${err.message ?? ""}` : "";
    } catch {
      // Non-JSON error body — status is enough.
    }
    throw new Error(
      `GrowSurf ${init.method} ${path(campaignId)} -> ${response.status}${detail ? ` ${detail}` : ""}`
    );
  }

  return (await response.json()) as T;
}

export interface GrowSurfParticipant {
  id: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  referralCount?: number;
  shareUrl?: string;
  fraudRiskLevel?: string;
  fraudReasonCode?: string;
  metadata?: Record<string, unknown>;
}

/**
 * POST /campaign/{id}/participant — adds (or returns the existing)
 * participant. `referredBy` accepts the referrer's GrowSurf id or email
 * (REST API.md, CreateParticipantRequest).
 */
export async function addGrowSurfParticipant(input: {
  email: string;
  firstName?: string;
  lastName?: string;
  referredBy?: string;
  ipAddress?: string;
  fingerprint?: string;
  metadata?: Record<string, unknown>;
}): Promise<GrowSurfParticipant | null> {
  return growSurfFetch<GrowSurfParticipant>((cid) => `/campaign/${cid}/participant`, {
    method: "POST",
    body: input,
  });
}

export interface GrowSurfReferralTrigger {
  success: boolean;
  message?: string;
}

/**
 * POST /campaign/{id}/participant/{idOrEmail}/ref — awards referral credit
 * to the participant's referrer (trigger: Sign Up + Qualifying Action).
 * `delayInDays` (1–90) holds the credit through a refund window; the
 * pending trigger can be cancelled with cancelGrowSurfDelayedReferral.
 */
export async function triggerGrowSurfReferral(
  participantIdOrEmail: string,
  delayInDays?: number
): Promise<GrowSurfReferralTrigger | null> {
  const body =
    delayInDays && delayInDays >= 1 ? { delayInDays: Math.min(delayInDays, 90) } : {};
  return growSurfFetch<GrowSurfReferralTrigger>(
    (cid) =>
      `/campaign/${cid}/participant/${encodeURIComponent(participantIdOrEmail)}/ref`,
    { method: "POST", body }
  );
}

/**
 * DELETE /campaign/{id}/participant/{idOrEmail}/ref — cancels a delayed
 * referral trigger that hasn't awarded yet (refund/chargeback inside the
 * hold window). No-op if the trigger already landed.
 */
export async function cancelGrowSurfDelayedReferral(
  participantIdOrEmail: string
): Promise<GrowSurfReferralTrigger | null> {
  return growSurfFetch<GrowSurfReferralTrigger>(
    (cid) =>
      `/campaign/${cid}/participant/${encodeURIComponent(participantIdOrEmail)}/ref`,
    { method: "DELETE" }
  );
}

/** GET /campaign/{id}/participant/{idOrEmail} — 404 returns null. */
export async function getGrowSurfParticipant(
  participantIdOrEmail: string
): Promise<GrowSurfParticipant | null> {
  const apiKey = growSurfApiKey();
  const campaignId = growSurfCampaignId();
  if (!apiKey || !campaignId) return null;

  const response = await fetch(
    `${BASE_URL}/campaign/${campaignId}/participant/${encodeURIComponent(participantIdOrEmail)}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    }
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`GrowSurf GET participant -> ${response.status}`);
  }
  return (await response.json()) as GrowSurfParticipant;
}
