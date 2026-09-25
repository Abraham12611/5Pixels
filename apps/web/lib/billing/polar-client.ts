import { Polar } from "@polar-sh/sdk";

export function polarServer(): "sandbox" | "production" {
  const env = process.env.POLAR_SERVER?.trim();
  return env === "production" ? "production" : "sandbox";
}

export function polarWebhookSecret(): string | null {
  return process.env.POLAR_WEBHOOK_SECRET?.trim() ?? null;
}

export function polarOrganizationId(): string | null {
  return process.env.POLAR_ORGANIZATION_ID?.trim() ?? null;
}

/**
 * Resolves a plan's Polar product id for the active environment.
 *
 * Polar issues different product ids in sandbox and production, so ids are
 * stored per environment in plans.metadata. The unsuffixed `polar_product_id`
 * is accepted as a fallback for any row written before that split.
 */
export function resolvePolarProductId(
  metadata: unknown
): string | null {
  const meta = (metadata ?? {}) as Record<string, unknown>;
  const scoped = meta[`polar_product_id_${polarServer()}`];
  if (typeof scoped === "string" && scoped.length > 0) return scoped;

  const legacy = meta.polar_product_id;
  return typeof legacy === "string" && legacy.length > 0 ? legacy : null;
}

export function createPolarClient(): Polar {
  const accessToken = process.env.POLAR_ACCESS_TOKEN?.trim();

  if (!accessToken) {
    throw new Error("POLAR_ACCESS_TOKEN is not set");
  }

  return new Polar({
    accessToken,
    server: polarServer(),
  });
}
