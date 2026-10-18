/**
 * Server-authoritative capability registry for provider routes (#177).
 *
 * One shared table — consumed by the admin product form + publish gate
 * (#177), the generation pipeline (#179), and quotability checks. It is the
 * input-side counterpart to `lib/pricing/definitions/fal.ts`: a route is
 * only configurable for multi-image or prompt-edit presets when it has a
 * verified entry here. Unknown endpoints fail closed.
 *
 * IMPORTANT: capabilities are verified against the provider's own schema and
 * model documentation — never inferred from the mere presence of an
 * `image_urls` array parameter. Entries record the total input budget the
 * model supports; the generation pipeline must fit user inputs AND admin
 * private reference assets inside `max_input_images`.
 */
import { resolveEndpoint } from "@/lib/ai/provider-routing";

export interface RouteCapability {
  /**
   * Total input images the endpoint accepts in one request — user inputs
   * plus admin reference assets combined. 1 = single-image route.
   */
  max_input_images: number;
  /**
   * Whether the endpoint accepts user free-text edit instructions composed
   * into the recipe prompt. All current image-edit routes take a `prompt`
   * param; this flag exists so a future route without editable text support
   * fails closed for `prompt_override_enabled` presets.
   */
  supports_prompt_edit: boolean;
  /**
   * Fal's schema has no named-role parameters — the provider contract is an
   * ordered `image_urls` array, so declared role names are a 5Pixels
   * ordering convention only. `null` = order-based roles accepted; a future
   * route with real role parameters should list the accepted names here.
   */
  accepted_roles: readonly string[] | null;
  /** Provenance for the numbers — schema/docs reference. */
  source: string;
}

const FAL_SCHEMA = "fal queue OpenAPI (image_urls array, unbounded)";
const GOOGLE_NB2 = "Google gemini-3.1-flash-image docs: ≤14 images/prompt";
const GOOGLE_NBPRO = "Google gemini-3-pro-image docs: ≤14 images/prompt";
const GOOGLE_NB = "Google gemini-2.5-flash-image docs: ≤3 images/prompt";

const ROUTE_CAPABILITIES: Record<string, RouteCapability> = {
  "fal-ai/nano-banana-2/edit": {
    max_input_images: 14,
    supports_prompt_edit: true,
    accepted_roles: null,
    source: `${FAL_SCHEMA}; ${GOOGLE_NB2}`,
  },
  "fal-ai/gemini-3.1-flash-image-preview/edit": {
    max_input_images: 14,
    supports_prompt_edit: true,
    accepted_roles: null,
    source: `${FAL_SCHEMA}; ${GOOGLE_NB2}`,
  },
  "fal-ai/nano-banana-pro/edit": {
    max_input_images: 14,
    supports_prompt_edit: true,
    accepted_roles: null,
    source: `${FAL_SCHEMA}; ${GOOGLE_NBPRO}`,
  },
  "fal-ai/gemini-3-pro-image-preview/edit": {
    max_input_images: 14,
    supports_prompt_edit: true,
    accepted_roles: null,
    source: `${FAL_SCHEMA}; ${GOOGLE_NBPRO}`,
  },
  "fal-ai/nano-banana/edit": {
    max_input_images: 3,
    supports_prompt_edit: true,
    accepted_roles: null,
    source: `${FAL_SCHEMA}; ${GOOGLE_NB}`,
  },
  "fal-ai/gemini-25-flash-image/edit": {
    max_input_images: 3,
    supports_prompt_edit: true,
    accepted_roles: null,
    source: `${FAL_SCHEMA}; ${GOOGLE_NB}`,
  },
};

/**
 * Capability for a version's pinned primary route. `provider`/`model` are the
 * raw provider_strategy values; resolution mirrors the submit path.
 * Returns null for unknown routes — callers must treat null as
 * "not configurable", never as a default.
 */
export function getRouteCapability(
  provider: string | undefined,
  model: string | undefined
): RouteCapability | null {
  if (!provider || !model) return null;
  const endpoint = resolveEndpoint(provider, model);
  return endpoint ? (ROUTE_CAPABILITIES[endpoint] ?? null) : null;
}

/** Serializable client-facing subset for the admin form. */
export interface RouteCapabilityView {
  maxInputImages: number;
  supportsPromptEdit: boolean;
}

export function toCapabilityView(
  capability: RouteCapability | null
): RouteCapabilityView {
  return {
    maxInputImages: capability?.max_input_images ?? 1,
    supportsPromptEdit: capability?.supports_prompt_edit ?? false,
  };
}
