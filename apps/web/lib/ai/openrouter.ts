/**
 * OpenRouter chat client — server-only. Used by the background
 * public-prompt-recipe generator; `OPENROUTER_API_KEY` must never reach
 * the client bundle.
 *
 * Free-tier models are best-effort: callers should chain
 * `PROMPT_RECIPE_MODELS` and tolerate failures (rate limits, model
 * downtime) by trying the next entry.
 */

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 30_000;

export const PROMPT_RECIPE_MODELS = [
  "minimax/minimax-m3.1-flash:free",
  "nvidia/nemotron-3.5-lightning:free",
  "google/gemma-4-26b-a4b-it:free",
] as const;

export type MessageContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ChatMessage {
  role: "system" | "user";
  content: string | MessageContentPart[];
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "http://localhost:3000"
  );
}

/** Single chat completion. Throws on missing key, non-2xx, malformed
 *  JSON, or empty content — the caller decides whether to try the next
 *  model. The request/response bodies are never logged. */
export async function openRouterChatText(options: {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      "http-referer": siteUrl(),
      "x-title": "5Pixels",
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      max_tokens: options.maxTokens ?? 2_000,
      temperature: options.temperature ?? 0.7,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter request failed with ${response.status}`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("OpenRouter returned invalid JSON");
  }

  const choices = (body as { choices?: unknown }).choices;
  const content =
    Array.isArray(choices) && choices.length > 0
      ? (choices[0] as { message?: { content?: unknown } }).message?.content
      : undefined;

  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("OpenRouter returned empty content");
  }
  return content;
}
