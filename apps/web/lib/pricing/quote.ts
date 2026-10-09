import type { SupabaseClient } from "@supabase/supabase-js";
import { getActivePricingPolicy } from "./policy";
import { getEndpointState, getFreshSnapshot } from "./snapshots";
import { quoteFal } from "./adapters/fal";
import { creditsForProviderCost } from "./types";
import type { ProviderQuote } from "./types";

export interface CreateQuoteInput {
  userId: string;
  productId: string;
  productVersionId: string;
  /** The exact options blob create_generation will later receive. */
  options: Record<string, unknown>;
  outputWidth: number;
  outputHeight: number;
  /** Server-resolved provider endpoints — recipe-derived or lab-pinned. */
  provider: string;
  endpoint: string;
  fallbackEndpoint?: string | null;
}

export type CreateQuoteResult =
  | {
      ok: true;
      quoteId: string;
      /** Credits reserved up front — the number customers should see. */
      reserveCredits: number;
      /** Credits charged if the request settles at expected cost. */
      expectedCredits: number;
      endpoint: string;
      /** Present only when the fallback fits inside the price envelope. */
      eligibleFallbackEndpoint: string | null;
    }
  | { ok: false; reason: string };

/**
 * Fingerprint the options blob exactly the way create_generation will hash it:
 * in Postgres, over the normalized jsonb text. JS-side hashing can't reproduce
 * jsonb's canonical key ordering/spacing, so this must be an RPC.
 */
async function optionsFingerprint(
  service: SupabaseClient,
  options: Record<string, unknown>
): Promise<string | null> {
  const { data, error } = await service.rpc("options_fingerprint", {
    p_options: options,
  });
  if (error || typeof data !== "string") {
    console.error("[pricing] options fingerprint failed", error?.message);
    return null;
  }
  return data;
}

function quoteEndpoint(
  payload: Parameters<typeof quoteFal>[0],
  envelope: { width: number; height: number },
  slack: number
): ProviderQuote {
  return quoteFal(payload, envelope, { quoteMaxSlackFactor: slack });
}

/**
 * Create a server-authoritative, short-lived, single-use generation quote.
 *
 * Fail-closed at every boundary: no active policy, no fresh snapshot, a
 * suspended route, or an unquotable pricing shape all refuse the generation
 * rather than estimating. The fallback endpoint is only eligible for failover
 * when its bounded maximum fits inside the primary quote's price envelope.
 */
export async function createGenerationQuote(
  service: SupabaseClient,
  input: CreateQuoteInput
): Promise<CreateQuoteResult> {
  const policy = await getActivePricingPolicy(service);
  if (!policy) {
    return { ok: false, reason: "pricing_unavailable" };
  }

  const [primarySnapshot, primaryState] = await Promise.all([
    getFreshSnapshot(service, input.provider, input.endpoint),
    getEndpointState(service, input.provider, input.endpoint),
  ]);

  if (primaryState === "suspended") {
    return { ok: false, reason: "endpoint_suspended" };
  }
  if (!primarySnapshot) {
    return { ok: false, reason: "pricing_unavailable" };
  }

  const envelope = { width: input.outputWidth, height: input.outputHeight };
  const primaryQuote = quoteEndpoint(
    primarySnapshot.payload,
    envelope,
    policy.quoteMaxSlackFactor
  );
  if (primaryQuote.kind === "unsafe") {
    console.error(
      "[pricing] primary endpoint unquotable",
      input.endpoint,
      primaryQuote.reason
    );
    return { ok: false, reason: "pricing_unavailable" };
  }

  // Price envelope = the primary route's bounded maximum. A fallback route
  // is only eligible when it fits inside — resilience must never break the
  // economics the customer was quoted.
  const envelopeMaxUsd = primaryQuote.maximumCostUsd;
  const allowedEndpointIds = [input.endpoint];
  let fallbackSnapshotId: string | null = null;
  let fallbackSnapshotExpiry: string | null = null;
  let eligibleFallback: string | null = null;

  if (input.fallbackEndpoint) {
    const [fallbackSnapshot, fallbackState] = await Promise.all([
      getFreshSnapshot(service, input.provider, input.fallbackEndpoint),
      getEndpointState(service, input.provider, input.fallbackEndpoint),
    ]);

    if (fallbackSnapshot && fallbackState === "active") {
      const fallbackQuote = quoteEndpoint(
        fallbackSnapshot.payload,
        envelope,
        policy.quoteMaxSlackFactor
      );
      if (
        fallbackQuote.kind !== "unsafe" &&
        fallbackQuote.maximumCostUsd <= envelopeMaxUsd
      ) {
        allowedEndpointIds.push(input.fallbackEndpoint);
        fallbackSnapshotId = fallbackSnapshot.id;
        fallbackSnapshotExpiry = fallbackSnapshot.expiresAt;
        eligibleFallback = input.fallbackEndpoint;
      }
    }
  }

  const fingerprint = await optionsFingerprint(service, input.options);
  if (!fingerprint) {
    return { ok: false, reason: "pricing_unavailable" };
  }

  const reserveCredits = creditsForProviderCost(envelopeMaxUsd);
  const expectedCredits = creditsForProviderCost(primaryQuote.expectedCostUsd);
  // A quote must never outlive the pricing that authorized it: expiry is the
  // earliest of the quote TTL and every snapshot it pins.
  const expiresAt = new Date(
    Math.min(
      Date.now() + policy.quoteTtlSeconds * 1000,
      Date.parse(primarySnapshot.expiresAt),
      ...(fallbackSnapshotExpiry ? [Date.parse(fallbackSnapshotExpiry)] : [])
    )
  );

  const { data, error } = await service
    .from("generation_quotes")
    .insert({
      user_id: input.userId,
      product_id: input.productId,
      product_version_id: input.productVersionId,
      provider: input.provider,
      endpoint_id: input.endpoint,
      fallback_endpoint_id: input.fallbackEndpoint ?? null,
      allowed_endpoint_ids: allowedEndpointIds,
      expected_cost_usd: primaryQuote.expectedCostUsd,
      maximum_cost_usd: envelopeMaxUsd,
      reserve_credits: reserveCredits,
      pricing_snapshot_id: primarySnapshot.id,
      fallback_snapshot_id: fallbackSnapshotId,
      policy_version: policy.version,
      params: {
        width: input.outputWidth,
        height: input.outputHeight,
        primary_components: primaryQuote.components,
      },
      options_fingerprint: fingerprint,
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    console.error("[pricing] quote insert failed", error?.message);
    return { ok: false, reason: "pricing_unavailable" };
  }

  return {
    ok: true,
    quoteId: data.id,
    reserveCredits,
    expectedCredits,
    endpoint: input.endpoint,
    eligibleFallbackEndpoint: eligibleFallback,
  };
}
