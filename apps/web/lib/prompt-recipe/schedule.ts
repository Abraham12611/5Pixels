import { after } from "next/server";
import { ensurePromptRecipe } from "./generate";

/**
 * Fire-and-forget recipe generation after an admin save/publish. Inside
 * a Next.js request scope this registers with `after()` so the response
 * isn't blocked and Vercel's waitUntil keeps the work alive. Outside a
 * request scope (tests, scripts) `after` throws — fall back to a plain
 * unawaited call. Generation failures are logged, never thrown: a missing
 * recipe must never break the save that triggered it.
 */
export function schedulePromptRecipe(productId: string): void {
  const run = () =>
    ensurePromptRecipe(productId)
      .then((result) => {
        if (result === "failed") {
          console.warn(
            `[prompt-recipe] generation failed for product ${productId}`
          );
        }
      })
      .catch((err: unknown) => {
        console.error(
          `[prompt-recipe] ensure threw for product ${productId}:`,
          err instanceof Error ? err.message : String(err)
        );
      });

  try {
    after(run);
  } catch {
    void run();
  }
}
