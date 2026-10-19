#!/usr/bin/env node
/**
 * #185 fal smoke test — real provider calls against the live fal API.
 *
 *   node scripts/fal-smoke.mjs --screen [--img <pathOrUrl>]...
 *   node scripts/fal-smoke.mjs --generate [endpoint] [--img <pathOrUrl>]...
 *
 * --screen   POSTs each image to fal-ai/imageutils/nsfw and expects
 *            nsfw_probability < 0.5 (the shipped block threshold). This is
 *            the same request shape lib/moderation/image.ts issues.
 * --generate submits a real multi-image edit through the fal queue and
 *            polls to completion — proves the ordered image_urls contract
 *            works end-to-end on a live route (default nano-banana/edit,
 *            max_input_images=3, cheapest tier). Costs real provider
 *            credits (~$0.04–0.15); run deliberately.
 *
 * Images default to two small generated PNGs (distinct colors) so the
 * smoke never depends on external hosting and never needs real user
 * content. FAL_KEY comes from env or apps/web/.env.local.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const NSFW_ENDPOINT = "https://fal.run/fal-ai/imageutils/nsfw";
const QUEUE_BASE = "https://queue.fal.run";
const BLOCK_THRESHOLD = 0.5;
const DEFAULT_ENDPOINT = "fal-ai/nano-banana/edit";

// ---------------------------------------------------------------------------

function loadFalKey() {
  if (process.env.FAL_KEY?.trim()) return process.env.FAL_KEY.trim();
  for (const p of ["apps/web/.env.local", ".env.local"]) {
    const f = resolve(process.cwd(), p);
    if (!existsSync(f)) continue;
    const m = readFileSync(f, "utf8").match(/^FAL_KEY=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

// Two distinct known-valid 1x1 PNGs — enough to prove an ordered
// multi-image payload without external hosting or real user content.
const DEFAULT_IMAGES = [
  // 1x1 RGBA (repo test fixture byte sequence)
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63fcffff3f030005fe02fea79d99dd0000000049454e44ae426082",
].map((h) => `data:image/png;base64,${Buffer.from(h, "hex").toString("base64")}`);
DEFAULT_IMAGES.push(
  // 1x1 red PNG (standard reference image)
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
);

async function toImageArg(spec) {
  if (/^https?:\/\//.test(spec)) return spec;
  const bytes = readFileSync(spec);
  const mime = spec.endsWith(".png") ? "image/png"
    : /\.(jpe?g)$/i.test(spec) ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

// ---------------------------------------------------------------------------

async function screen(imageUrl, falKey) {
  const res = await fetch(NSFW_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, body };
  const p = body?.nsfw_probability ?? body?.data?.nsfw_probability;
  if (typeof p !== "number") return { ok: false, error: "malformed", body };
  return { ok: true, probability: p, verdict: p >= BLOCK_THRESHOLD ? "blocked" : "allow" };
}

async function submitAndWait(endpoint, input, falKey, timeoutMs = 300_000) {
  const submit = await fetch(`${QUEUE_BASE}/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(30_000),
  });
  const submitBody = await submit.json().catch(() => null);
  if (!submit.ok) return { ok: false, stage: "submit", status: submit.status, body: submitBody };
  const statusUrl = submitBody?.status_url;
  const resultUrl = submitBody?.response_url;
  if (!statusUrl || !resultUrl) {
    return { ok: false, stage: "submit", status: submit.status, body: submitBody };
  }
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const st = await fetch(statusUrl, {
      headers: { Authorization: `Key ${falKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    const stBody = await st.json().catch(() => null);
    const status = stBody?.status;
    if (status === "COMPLETED") {
      const rs = await fetch(resultUrl, {
        headers: { Authorization: `Key ${falKey}` },
        signal: AbortSignal.timeout(60_000),
      });
      const data = await rs.json().catch(() => null);
      return { ok: rs.ok, stage: "result", status: rs.status, body: data, requestId: submitBody.request_id };
    }
    if (status !== "IN_QUEUE" && status !== "IN_PROGRESS") {
      return { ok: false, stage: "status", status: st.status, body: stBody };
    }
    if (Date.now() > deadline) return { ok: false, stage: "timeout" };
    await new Promise((r) => setTimeout(r, 3000));
  }
}

// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const mode = args[0]?.startsWith("--") ? args[0] : "--screen";
const imgs = [];
let endpoint = DEFAULT_ENDPOINT;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--img") imgs.push(args[++i]);
  else if (!args[i].startsWith("--")) endpoint = args[i];
}

const falKey = loadFalKey();
if (!falKey) {
  console.error("FAIL: FAL_KEY not found in env or apps/web/.env.local");
  process.exit(2);
}

const evidence = { mode, endpoint, timestamp: new Date().toISOString() };

if (mode === "--screen") {
  const targets = imgs.length ? imgs : [null, null]; // two default PNGs
  let pass = true;
  const results = [];
  for (let i = 0; i < targets.length; i++) {
    const url = targets[i]
      ? await toImageArg(targets[i])
      : DEFAULT_IMAGES[i];
    const r = await screen(url, falKey);
    results.push({ image: targets[i] ?? `generated-${i}`, ...r });
    if (!r.ok || r.verdict !== "allow") pass = false;
  }
  evidence.results = results;
  console.log(JSON.stringify(evidence, null, 2));
  console.log(pass ? "PASS: classifier reachable, benign images allowed" : "FAIL: see results");
  process.exit(pass ? 0 : 1);
}

if (mode === "--generate") {
  const urls = imgs.length >= 2
    ? await Promise.all(imgs.map((s) => toImageArg(s)))
    : DEFAULT_IMAGES;
  const input = {
    prompt: "Combine the two input images into a single clean product-style photo.",
    image_url: urls[0],
    image_urls: urls,
    num_images: 1,
  };
  const r = await submitAndWait(endpoint, input, falKey);
  const imageCount =
    r.body?.images?.length ?? (r.body?.image ? 1 : 0);
  evidence.request = { sent_image_count: urls.length, endpoint };
  evidence.response = {
    ok: r.ok, stage: r.stage, status: r.status,
    requestId: r.requestId, returned_images: imageCount,
    body_keys: r.body ? Object.keys(r.body) : null,
  };
  console.log(JSON.stringify(evidence, null, 2));
  const pass = r.ok && imageCount > 0;
  console.log(pass
    ? `PASS: ${urls.length} ordered inputs accepted by ${endpoint}, generation completed`
    : "FAIL: provider rejected or returned no image — see response");
  process.exit(pass ? 0 : 1);
}

console.error(`unknown mode: ${mode} (use --screen or --generate)`);
process.exit(2);
