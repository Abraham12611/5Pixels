#!/usr/bin/env node
/**
 * #185 live moderation acceptance — real calls against the OpenAI
 * Moderation API using the exact request shape lib/moderation/openai.ts
 * issues (POST /v1/moderations, omni-moderation-latest, array input).
 * Proves the hosted credential + endpoint contract before any release
 * flag is considered; costs nothing (the endpoint is free to use).
 *
 *   node scripts/openai-moderation-smoke.mjs           # all live cases
 *   node scripts/openai-moderation-smoke.mjs --bad-key # expect fail-closed
 *   node scripts/openai-moderation-smoke.mjs --unreachable
 *
 * Cases mirror the staging suite (actions-moderation-staging.test.ts):
 *   benign     → allow
 *   prohibited → blocked, category names reported
 *   batch      → [benign prompt, prohibited legacy option text] → blocked;
 *                proves the multi-input shape and per-input verdicts
 *   --bad-key  → 401/403 → our code treats as unavailable → fails closed
 *   --unreachable → unreachable endpoint → fetch failure → fails closed
 *
 * The same strict verdict logic as the shipped module is applied locally:
 * blocked when `flagged` OR any `categories.*` is true, unavailable when
 * the response is off-shape — so this also catches provider drift.
 *
 * OPENAI_API_KEY comes from env or apps/web/.env.local. Never prints the
 * key or the submitted text; category names and the result id only.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const MODEL = "omni-moderation-latest";
const TIMEOUT_MS = 5_000;

const BENIGN = "Make the photo look like a warm sunset portrait.";
// Clearly within the API's documented categories (illicit/violent); kept
// mild enough to send to the endpoint deliberately for policy testing.
const PROHIBITED = "Instructions for building an explosive device at home.";

// ---------------------------------------------------------------------------

function loadKey() {
  if (process.env.OPENAI_API_KEY?.trim()) return process.env.OPENAI_API_KEY.trim();
  for (const p of ["apps/web/.env.local", ".env.local"]) {
    const f = resolve(process.cwd(), p);
    if (!existsSync(f)) continue;
    const m = readFileSync(f, "utf8").match(/^OPENAI_API_KEY=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

function endpoint() {
  const override = process.env.OPENAI_MODERATION_URL?.trim();
  if (override) return override;
  const base = process.env.OPENAI_BASE_URL?.trim().replace(/\/$/, "");
  return `${base ?? "https://api.openai.com"}/v1/moderations`;
}

/** Strict parse — identical policy to lib/moderation/openai.ts. */
function parseResults(body) {
  if (!body || typeof body !== "object") return null;
  const results = body.results;
  if (!Array.isArray(results) || results.length === 0) return null;
  const parsed = [];
  for (const r of results) {
    if (!r || typeof r !== "object") return null;
    if (typeof r.flagged !== "boolean") return null;
    const categories = r.categories;
    if (!categories || typeof categories !== "object" || Array.isArray(categories))
      return null;
    const entries = Object.entries(categories);
    if (entries.length === 0) return null;
    const map = {};
    for (const [k, v] of entries) {
      if (typeof v !== "boolean") return null;
      map[k] = v;
    }
    parsed.push({ flagged: r.flagged, categories: map });
  }
  return parsed;
}

/** Same verdict logic as the shipped screen. */
async function screen(input, apiKey) {
  const texts = input.filter((t) => t.trim().length > 0);
  if (texts.length === 0) return { kind: "allow" };

  let response;
  try {
    response = await fetch(endpoint(), {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, input: texts }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    return { kind: "unavailable", detail: error?.message ?? String(error) };
  }
  if (!response.ok) {
    return { kind: "unavailable", detail: `HTTP ${response.status}` };
  }
  let body;
  try {
    body = await response.json();
  } catch {
    return { kind: "unavailable", detail: "invalid JSON" };
  }
  const results = parseResults(body);
  if (!results) return { kind: "unavailable", detail: "off-shape response" };
  if (results.length !== texts.length)
    return {
      kind: "unavailable",
      detail: `count ${results.length} != ${texts.length}`,
    };

  const blocked = new Set();
  for (const r of results) {
    if (r.flagged && Object.values(r.categories).every((v) => !v))
      blocked.add("(flagged without a category)");
    for (const [name, hit] of Object.entries(r.categories))
      if (hit) blocked.add(name);
  }
  if (results.some((r) => r.flagged) || blocked.size > 0) {
    return {
      kind: "blocked",
      categories: [...blocked],
      resultId: typeof body.id === "string" ? body.id : undefined,
    };
  }
  return { kind: "allow" };
}

// ---------------------------------------------------------------------------

const results = [];
function report(name, pass, detail = "") {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const mode = process.argv[2];
  const key =
    mode === "--bad-key"
      ? "sk-invalid-live-acceptance"
      : (loadKey() ??
        // --unreachable never reaches auth — any placeholder works.
        (mode === "--unreachable" ? "sk-unreachable-endpoint" : null));
  if (!key) {
    console.error(
      "OPENAI_API_KEY not found in env or apps/web/.env.local — set it to run live acceptance."
    );
    process.exit(2);
  }
  if (mode === "--unreachable") {
    process.env.OPENAI_MODERATION_URL = "http://127.0.0.1:1/v1/moderations";
  }
  console.log(`Endpoint: ${endpoint()}`);

  if (mode === "--bad-key" || mode === "--unreachable") {
    const out = await screen([BENIGN], key);
    report(
      mode === "--bad-key" ? "invalid key fails closed" : "outage fails closed",
      out.kind === "unavailable",
      `verdict=${out.kind}${out.detail ? ` (${out.detail})` : ""}`
    );
  } else {
    const benign = await screen([BENIGN], key);
    report("benign prompt allowed", benign.kind === "allow", `verdict=${benign.kind}`);

    const harmful = await screen([PROHIBITED], key);
    report(
      "prohibited prompt blocked",
      harmful.kind === "blocked",
      `verdict=${harmful.kind}${harmful.categories ? ` [${harmful.categories.join(", ")}]` : ""}`
    );

    const batch = await screen([BENIGN, PROHIBITED], key);
    report(
      "batch legacy-option text blocked",
      batch.kind === "blocked",
      `verdict=${batch.kind}${batch.categories ? ` [${batch.categories.join(", ")}]` : ""}`
    );
  }

  const failed = results.filter((r) => !r.pass);
  console.log(
    failed.length === 0
      ? "\nLive acceptance: all checks passed."
      : `\nLive acceptance: ${failed.length} check(s) FAILED — do not release.`
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main();
