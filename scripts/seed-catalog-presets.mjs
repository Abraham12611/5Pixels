#!/usr/bin/env node
/**
 * Seed the public preset catalog with products + preset-media imagery.
 *
 * Reads scripts/preset-seed-manifest.json. For each preset it:
 *   1. uploads each image (scripts/preset-media/<slug>/<file> or https URL)
 *      into the public `preset-media` bucket under admins/<admin_user_id>/
 *   2. inserts `assets` rows (visibility: public)
 *   3. upserts the `products` row (by slug) and sets hero/poster asset ids
 *   4. links `product_assets` (hero / poster / example_result)
 *   5. upserts an active `product_versions` v1 with the manifest config
 *
 * It also links the already-uploaded hero/poster assets of existing products
 * into `product_assets` (posters are otherwise invisible to the catalog RPC).
 *
 * Usage:
 *   node scripts/seed-catalog-presets.mjs            # full seed
 *   node scripts/seed-catalog-presets.mjs --verify   # anon-read sanity check
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 * (or the environment). The service key never leaves this machine.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mediaDir = join(root, "scripts", "preset-media");

/* ---------- env ---------- */

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
const BASE = (env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL ?? "").replace(/\/$/, "");
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

if (!BASE) fail("NEXT_PUBLIC_SUPABASE_URL is not set (.env.local)");

const manifest = JSON.parse(
  readFileSync(join(root, "scripts", "preset-seed-manifest.json"), "utf8"),
);
const ADMIN_ID = manifest.admin_user_id;

/* ---------- helpers ---------- */

function fail(msg) {
  console.error(`\n  ✗ ${msg}\n`);
  process.exit(1);
}

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

function headers(extra = {}) {
  return {
    apikey: SERVICE,
    Authorization: `Bearer ${SERVICE}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function rest(method, table, { query = "", body, prefer = "return=representation" } = {}) {
  const res = await fetch(`${BASE}/rest/v1/${table}${query}`, {
    method,
    headers: headers({ Prefer: prefer }),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) fail(`${method} ${table}${query} → ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function loadImageBytes(spec) {
  if (spec.startsWith("https://")) {
    const res = await fetch(spec);
    if (!res.ok) fail(`fetch ${spec} → ${res.status}`);
    const ext = extname(new URL(spec).pathname) || ".png";
    return { buf: Buffer.from(await res.arrayBuffer()), ext };
  }
  const path = join(mediaDir, spec);
  if (!existsSync(path)) fail(`missing image file scripts/preset-media/${spec}`);
  return { buf: readFileSync(path), ext: extname(spec).toLowerCase() };
}

async function uploadObject(storageKey, buf, mime) {
  const res = await fetch(`${BASE}/storage/v1/object/preset-media/${storageKey}`, {
    method: "POST",
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      "Content-Type": mime,
      "x-upsert": "true",
    },
    body: buf,
  });
  if (!res.ok) fail(`storage upload ${storageKey} → ${res.status}: ${await res.text()}`);
}

async function findOrCreateAsset(storageKey, buf, mime, sourceType) {
  const existing = await rest("GET", "assets", {
    query: `?select=id&bucket=eq.preset-media&storage_key=eq.${encodeURIComponent(storageKey)}`,
  });
  if (existing?.length) return existing[0].id;
  const rows = await rest("POST", "assets", {
    body: {
      owner_user_id: ADMIN_ID,
      storage_provider: "supabase",
      storage_key: storageKey,
      bucket: "preset-media",
      media_type: "image",
      mime_type: mime,
      bytes: buf.byteLength,
      checksum: createHash("sha256").update(buf).digest("hex"),
      visibility: "public",
      source_type: sourceType,
    },
  });
  return rows[0].id;
}

async function ensureLink(productId, assetId, role, sortOrder) {
  const existing = await rest("GET", "product_assets", {
    query: `?select=id&product_id=eq.${productId}&asset_id=eq.${assetId}&role=eq.${role}`,
  });
  if (existing?.length) return;
  await rest("POST", "product_assets", {
    body: { product_id: productId, asset_id: assetId, role, sort_order: sortOrder, internal_only: false },
  });
}

async function upsertProduct(p, heroId, posterId) {
  const existing = await rest("GET", "products", {
    query: `?select=id&slug=eq.${p.slug}`,
  });
  const row = {
    slug: p.slug,
    name: p.name,
    type: "filter",
    short_description: p.short_description,
    long_description: p.long_description,
    category_id: await categoryId(p.category_slug),
    visibility: "public",
    public_status: "active",
    featured_rank: p.featured_rank,
    metadata: {
      filter_config: {
        style_archetype: p.style_archetype,
        identity_preservation: p.identity_preservation,
      },
    },
    hero_asset_id: heroId,
    poster_asset_id: posterId,
  };
  if (existing?.length) {
    await rest("PATCH", "products", { query: `?id=eq.${existing[0].id}`, body: row });
    return existing[0].id;
  }
  const rows = await rest("POST", "products", { body: row });
  return rows[0].id;
}

let categoryCache;
async function categoryId(slug) {
  categoryCache ??= await rest("GET", "categories", { query: "?select=id,slug" });
  const hit = categoryCache.find((c) => c.slug === slug);
  if (!hit) fail(`category '${slug}' not found`);
  return hit.id;
}

async function upsertVersion(productId, p, d) {
  const row = {
    product_id: productId,
    version_number: 1,
    state: "active",
    private_instruction_template: p.instruction_template,
    provider_strategy: d.provider_strategy,
    model_config: d.model_config,
    input_validation_config: d.input_validation_config,
    post_process_config: d.post_process_config,
    safety_config: d.safety_config,
    credit_cost: p.credit_cost ?? d.credit_cost,
    output_sizes: d.output_sizes,
    created_by_admin_id: ADMIN_ID,
    published_at: new Date().toISOString(),
  };
  const existing = await rest("GET", "product_versions", {
    query: `?select=id&product_id=eq.${productId}&version_number=eq.1`,
  });
  if (existing?.length) {
    await rest("PATCH", "product_versions", { query: `?id=eq.${existing[0].id}`, body: row });
  } else {
    await rest("POST", "product_versions", { body: row });
  }
}

/* ---------- steps ---------- */

async function linkExistingHeroPosters() {
  const products = await rest("GET", "products", {
    query: "?select=id,slug,hero_asset_id,poster_asset_id&visibility=eq.public",
  });
  for (const p of products ?? []) {
    if (p.hero_asset_id) await ensureLink(p.id, p.hero_asset_id, "hero", 0);
    if (p.poster_asset_id) await ensureLink(p.id, p.poster_asset_id, "poster", 0);
    ok(`linked hero/poster for ${p.slug}`);
  }
}

async function seedPreset(p) {
  const d = manifest.defaults;
  const roleNames = { hero: "hero", poster: "poster", example: "example_result" };
  const assetIds = { hero: [], poster: [], example_result: [] };

  for (const [i, image] of p.images.entries()) {
    const role = roleNames[image.role ?? image] ?? "example_result";
    const spec = image.file ?? image;
    const { buf, ext } = await loadImageBytes(spec.startsWith("https://") ? spec : `${p.slug}/${spec}`);
    const storageKey = `admins/${ADMIN_ID}/${role}/${crypto.randomUUID()}${ext}`;
    await uploadObject(storageKey, buf, MIME[ext] ?? "image/png");
    const assetId = await findOrCreateAsset(storageKey, buf, MIME[ext] ?? "image/png", role);
    assetIds[role].push({ assetId, sortOrder: i });
  }

  const heroId = assetIds.hero[0]?.assetId ?? null;
  const posterId = assetIds.poster[0]?.assetId ?? assetIds.hero[0]?.assetId ?? null;
  const productId = await upsertProduct(p, heroId, posterId);

  for (const [role, list] of Object.entries(assetIds)) {
    for (const { assetId, sortOrder } of list) {
      await ensureLink(productId, assetId, role, sortOrder);
    }
  }

  await upsertVersion(productId, p, d);
  ok(`seeded ${p.slug} (${Object.values(assetIds).flat().length} assets)`);
}

async function verify() {
  const res = await fetch(`${BASE}/rest/v1/rpc/get_public_catalog`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_type: null, p_category_slug: null, p_product_ids: null, p_search: null, p_sort: "featured", p_page: 1, p_page_size: 50 }),
  });
  if (!res.ok) fail(`anon get_public_catalog → ${res.status}: ${await res.text()}`);
  const rows = await res.json();
  ok(`anon catalog returns ${rows.length} presets`);
  for (const r of rows) console.log(`      ${r.slug} — ${(r.public_assets ?? []).length} public assets`);
}

/* ---------- main ---------- */

const verifyOnly = process.argv.includes("--verify");
if (verifyOnly) {
  await verify();
} else {
  if (!SERVICE) fail("SUPABASE_SERVICE_ROLE_KEY is not set (.env.local)");
  await linkExistingHeroPosters();
  for (const p of manifest.presets) await seedPreset(p);
  console.log("\nDone. Verifying anon access:");
  if (ANON) await verify();
}
