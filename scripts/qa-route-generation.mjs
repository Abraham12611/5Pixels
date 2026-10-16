#!/usr/bin/env node
/**
 * Visual QA generations for route changes (issue #113).
 *
 * Runs ONE real Fal generation per launch-route change so a human can eyeball
 * the result before the new product version is activated. For each target it:
 *
 *   1. loads the preset's recipe (private instruction template, model_config,
 *      output sizes) straight from the database — for repoints this is the
 *      same recipe the new draft version carries, since it is a clone;
 *   2. submits to the intended provider endpoint through the Fal queue with
 *      the same pinned parameters the production submit adapter applies
 *      (num_images=1, limit_generations on the nano-banana family,
 *      aspect_ratio + resolution derived from the output size);
 *   3. polls until completion and downloads the result image.
 *
 * Read-only against the app database; the only side effects are Fal jobs
 * (~$0.04–0.16 each) and local output files under ./qa-route-outputs/.
 *
 * Usage:
 *   node scripts/qa-route-generation.mjs                      # all launch QA targets
 *   node scripts/qa-route-generation.mjs --slug cover-star    # one preset
 *   node scripts/qa-route-generation.mjs --source <url>       # custom source photo
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + FAL_KEY in
 * the environment or repo-root .env.local. Keys never leave this machine.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(root, "qa-route-outputs");

/* ---------- launch QA targets (issue #113) ---------- */
/* repoints → recipe of the current ACTIVE version (identical to the new
   draft clone), overridden to the new primary endpoint. cinematic-still is
   the existing draft v2 (nano-banana/edit primary). */
const TARGETS = [
  { slug: "studio-standard", recipeState: "active", endpoint: "fal-ai/nano-banana-2/edit" },
  { slug: "founder-portrait", recipeState: "active", endpoint: "fal-ai/nano-banana-2/edit" },
  { slug: "modern-professional", recipeState: "active", endpoint: "fal-ai/nano-banana-2/edit" },
  { slug: "creative-headshot", recipeState: "active", endpoint: "fal-ai/nano-banana-2/edit" },
  { slug: "cover-star", recipeState: "active", endpoint: "fal-ai/nano-banana-2/edit" },
  { slug: "manga-cutout", recipeState: "active", endpoint: "fal-ai/nano-banana-2/edit" },
  { slug: "cinematic-still", recipeState: "draft", endpoint: "fal-ai/nano-banana/edit" },
];

const DEFAULT_SOURCE =
  "https://euoasoqxowgcafcnzljq.supabase.co/storage/v1/object/public/preset-media/" +
  "admins/41b01f9c-f4bc-4bb8-912a-d13396b19be0/example-result/8f0bb8f9-3454-4bf0-adf8-a78b1cd899fc.jpg";

/* ---------- args / env ---------- */

const onlySlug = process.argv.includes("--slug")
  ? process.argv[process.argv.indexOf("--slug") + 1] : null;
const sourceIdx = process.argv.indexOf("--source");
const sourceUrl = sourceIdx > -1 ? process.argv[sourceIdx + 1] : DEFAULT_SOURCE;

function loadEnv() {
  const env = { ...process.env };
  for (const file of [".env.local", ".env"]) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}
const env = loadEnv();
const BASE = (env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const FAL_KEY = env.FAL_KEY ?? "";
if (!BASE || !SERVICE || !FAL_KEY) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and FAL_KEY");
  process.exit(1);
}

const dbHeaders = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
const falHeaders = { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" };

/* ---------- mirrors of apps/web/lib/ai/fal.ts submit pins ---------- */

const NANO_ASPECT_RATIOS = [
  [21 / 9, "21:9"], [16 / 9, "16:9"], [3 / 2, "3:2"], [4 / 3, "4:3"],
  [5 / 4, "5:4"], [1, "1:1"], [4 / 5, "4:5"], [3 / 4, "3:4"],
  [2 / 3, "2:3"], [9 / 16, "9:16"],
];
function nearestAspectRatio(w, h) {
  const target = w / h;
  let best = "1:1", bestDelta = Infinity;
  for (const [ratio, label] of NANO_ASPECT_RATIOS) {
    const d = Math.abs(ratio - target);
    if (d < bestDelta) { bestDelta = d; best = label; }
  }
  return best;
}
function falResolutionTier(px) {
  return px <= 1_100_000 ? "1K" : px <= 4_500_000 ? "2K" : "4K";
}

/* ---------- fal queue ---------- */

async function falSubmit(endpoint, body) {
  const res = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: "POST",
    headers: { ...falHeaders, "x-app-fal-disable-fallback": "true" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`submit ${endpoint} → ${res.status}: ${await res.text()}`);
  return res.json(); // { request_id, status_url, response_url }
}

async function falPoll(sub) {
  for (let i = 0; i < 120; i++) {
    const s = await fetch(sub.status_url, { headers: falHeaders }).then((r) => r.json());
    if (s.status === "COMPLETED") {
      const r = await fetch(sub.response_url, { headers: falHeaders }).then((r) => r.json());
      const url = r?.images?.[0]?.url ?? r?.image?.url;
      if (!url) throw new Error("completed but no image url in response");
      return url;
    }
    if (s.status && !["IN_QUEUE", "IN_PROGRESS"].includes(s.status))
      throw new Error(`unexpected status ${JSON.stringify(s).slice(0, 300)}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("timed out waiting for fal result");
}

/* ---------- per-target run ---------- */

async function recipeFor(slug, state) {
  const res = await fetch(
    `${BASE}/rest/v1/product_versions?select=id,version_number,private_instruction_template,` +
      `model_config,output_sizes,products!inner(slug)&products.slug=eq.${slug}&state=eq.${state}` +
      `&order=version_number.desc&limit=1`,
    { headers: dbHeaders }
  ).then((r) => r.json());
  if (!res?.[0]) throw new Error(`no ${state} version for ${slug}`);
  return res[0];
}

async function runTarget({ slug, recipeState, endpoint }) {
  const recipe = await recipeFor(slug, recipeState);
  const sizes = Array.isArray(recipe.output_sizes) ? recipe.output_sizes : [];
  const size = sizes.find((s) => s.is_default) ?? sizes[0] ?? { width: 1024, height: 1024 };

  const body = {
    ...(recipe.model_config ?? {}),
    image_url: sourceUrl,
    image_urls: [sourceUrl],
    prompt: recipe.private_instruction_template.trim(),
    image_size: { width: size.width, height: size.height },
    num_images: 1,
  };
  if (/^fal-ai\/(nano-banana|gemini-)/.test(endpoint)) body.limit_generations = true;
  body.aspect_ratio ??= nearestAspectRatio(size.width, size.height);
  body.resolution = falResolutionTier(size.width * size.height);

  const sub = await falSubmit(endpoint, body);
  console.log(`  ${slug} v${recipe.version_number}(${recipeState}) → ${endpoint}`);
  console.log(`    size ${size.width}x${size.height} (${body.resolution}, ${body.aspect_ratio}) request ${sub.request_id}`);
  const imageUrl = await falPoll(sub);

  const buf = Buffer.from(await (await fetch(imageUrl)).arrayBuffer());
  mkdirSync(OUT_DIR, { recursive: true });
  const file = join(OUT_DIR, `${slug}__${endpoint.split("/").slice(-2).join("_")}.png`);
  writeFileSync(file, buf);
  console.log(`    ✓ ${file}`);
  return { slug, endpoint, requestId: sub.request_id, file };
}

/* ---------- main ---------- */

const targets = onlySlug ? TARGETS.filter((t) => t.slug === onlySlug) : TARGETS;
if (!targets.length) { console.error(`no target matching --slug ${onlySlug}`); process.exit(1); }

const results = [];
for (const t of targets) {
  try {
    results.push(await runTarget(t));
  } catch (err) {
    console.error(`  ✗ ${t.slug}: ${err.message}`);
    results.push({ slug: t.slug, error: err.message });
  }
}

const failed = results.filter((r) => r.error);
console.log(`\n== ${results.length - failed.length}/${results.length} QA generations completed ==`);
process.exit(failed.length ? 1 : 0);
