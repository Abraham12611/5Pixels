/**
 * Image moderation (#179): screens user input photos through the
 * fal-ai/imageutils/nsfw classifier before provider transmission. This is
 * the only mechanism in the project that can attest to image content —
 * the Creem moderation API screens TEXT only and must never be treated as
 * image approval.
 *
 * Verdict policy:
 *  - nsfw_probability < NSFW_BLOCK_THRESHOLD → allow (caller stamps the
 *    asset 'approved' — the durable review record).
 *  - nsfw_probability >= threshold          → blocked (caller stamps
 *    'flagged' so the image cannot be re-submitted).
 *  - Missing provider key, non-2xx, timeout, or an unparseable/malformed
 *    response                          → unavailable; the caller fails
 *    closed. There is no flag-off path: an unscreened image never reaches
 *    the provider, matching the create_generation approval check.
 */

const NSFW_ENDPOINT = "https://fal.run/fal-ai/imageutils/nsfw";
const MODERATION_TIMEOUT_MS = 15_000;

/**
 * The classifier returns a calibrated 0–1 NSFW probability; 0.5 is the
 * model's own decision boundary — an image more likely NSFW than not must
 * never reach paid generation. Fail-closed: >= blocks.
 */
export const NSFW_BLOCK_THRESHOLD = 0.5;

export type ImageScreenOutcome =
  | { kind: "allow" }
  | { kind: "blocked"; probability: number }
  | { kind: "unavailable" };

function parseNsfwProbability(body: unknown): number | null {
  // fal.run returns the model output at the top level; tolerate a { data }
  // envelope so a client/proxy wrapper can't silently change the contract.
  const candidate =
    body && typeof body === "object"
      ? ((body as Record<string, unknown>).data ?? body)
      : body;
  if (!candidate || typeof candidate !== "object") return null;
  const p = (candidate as Record<string, unknown>).nsfw_probability;
  return typeof p === "number" && Number.isFinite(p) && p >= 0 && p <= 1
    ? p
    : null;
}

/**
 * Classify one image by URL. `externalId` is a privacy-safe correlation tag
 * (user/asset ids, never content) for log lines — same convention as
 * screenUserText.
 */
export async function screenUserImage(
  imageUrl: string,
  externalId?: string
): Promise<ImageScreenOutcome> {
  const apiKey = process.env.FAL_KEY?.trim();
  if (!apiKey) {
    console.error(
      "[image moderation] FAL_KEY is not configured — refusing to approve",
      externalId
    );
    return { kind: "unavailable" };
  }

  let res: Response;
  try {
    res = await fetch(NSFW_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image_url: imageUrl }),
      signal: AbortSignal.timeout(MODERATION_TIMEOUT_MS),
    });
  } catch (err) {
    console.error("[image moderation] request failed", externalId, err);
    return { kind: "unavailable" };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    console.error(
      "[image moderation] non-JSON response",
      res.status,
      externalId
    );
    return { kind: "unavailable" };
  }

  if (!res.ok) {
    console.error(
      "[image moderation] provider error",
      res.status,
      externalId
    );
    return { kind: "unavailable" };
  }

  const probability = parseNsfwProbability(body);
  if (probability === null) {
    console.error(
      "[image moderation] malformed response payload",
      externalId
    );
    return { kind: "unavailable" };
  }

  return probability >= NSFW_BLOCK_THRESHOLD
    ? { kind: "blocked", probability }
    : { kind: "allow" };
}
