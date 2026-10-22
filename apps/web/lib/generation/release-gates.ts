/**
 * Server-only release gates for consumer-facing capability surfaces — the
 * same OFF-by-default pattern as `isUserPromptReleased` (#183): an admin
 * capability flag is a *precondition*, never the release itself. Each gate
 * is enabled by a deploy-level env var so a shipped UI can't expose a flow
 * whose backend isn't live yet.
 */

/**
 * Multi-image preset inputs (#178) — held OFF until the provider pipeline
 * (#179) submits the full ordered input set. While OFF, multi-capable
 * presets render the original one-photo experience and the app-layer
 * `inputs.length > 1` guard keeps the charged path fail-closed.
 */
export function isMultiInputReleased(): boolean {
  return process.env.PRESET_MULTI_INPUT_ENABLED?.trim() === "true";
}
