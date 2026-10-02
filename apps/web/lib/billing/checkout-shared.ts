export interface CheckoutResult {
  checkoutUrl?: string;
  error?: string;
}

export interface CheckoutAttribution {
  experimentKey?: string;
  variantKey?: string;
  ladderStage?: string;
  growsurfParticipantId?: string;
  /** Promo-engine attribution — the offer step that sent this checkout. */
  campaignId?: string;
  campaignVariant?: string;
  campaignStep?: number;
}

export function attributionMetadata(
  attribution?: CheckoutAttribution
): Record<string, string> {
  const metadata: Record<string, string> = {};
  if (attribution?.experimentKey) {
    metadata.experiment_key = attribution.experimentKey;
  }
  if (attribution?.variantKey) {
    metadata.variant_key = attribution.variantKey;
  }
  if (attribution?.ladderStage) {
    metadata.ladder_stage = attribution.ladderStage;
  }
  if (attribution?.growsurfParticipantId) {
    metadata.growsurf_participant_id = attribution.growsurfParticipantId;
  }
  if (attribution?.campaignId) {
    metadata.campaign_id = attribution.campaignId;
  }
  if (attribution?.campaignVariant) {
    metadata.campaign_variant = attribution.campaignVariant;
  }
  if (attribution?.campaignStep !== undefined) {
    metadata.campaign_step = String(attribution.campaignStep);
  }
  return metadata;
}
