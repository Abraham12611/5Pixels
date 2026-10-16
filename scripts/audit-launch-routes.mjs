#!/usr/bin/env node
/**
 * Launch-gate route audit (issue #113) — READ-ONLY.
 *
 * Answers the question every published preset must pass before launch:
 * "is the route a customer would hit quotable right now?" For every public,
 * active-status product it resolves the ACTIVE product version's primary and
 * fallback provider endpoints and evaluates each against live database state:
 *
 *   - provider_pricing_snapshots — freshest row per endpoint; expired or
 *     missing → unquotable (the quote path fails closed the same way);
 *   - provider_endpoint_state   — suspended routes are unquotable;
 *   - pricing_policies          — active slack factor / capacity / TTLs;
 *   - output sizes              — quote envelope is evaluated per declared
 *     output size (defaults to 1024x1024 when the version declares none,
 *     which is also flagged — a version with no sizes cannot generate);
 *   - adapter quote             — mirrors lib/pricing/adapters/fal.ts:
 *     flat_per_request / per_megapixel / resolution_tier are bounded;
 *     anything else (incl. 'unsupported') is unsafe;
 *   - fallback envelope         — a fallback is only ELIGIBLE when it is
 *     independently fresh/active/bounded AND its bounded maximum fits inside
 *     the primary's maximum — exactly like createGenerationQuote.
 *
 * No generation_quotes rows are created and nothing is written to the
 * database. Exit code is 1 when any customer-visible route fails, so the
 * script can gate launch checklists and CI.
 *
 * Usage:
 *   node scripts/audit-launch-routes.mjs            # human-readable matrix
 *   node scripts/audit-launch-routes.mjs --json     # machine-readable
 *   node scripts/audit-launch-routes.mjs --all-versions   # also audit drafts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the
 * environment or the repo-root .env.local (service key stays local).
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const JSON_OUT = process.argv.includes("--json");
const ALL_VERSIONS = process.argv.includes("--all-versions");

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

function fail(msg) {
  console.error(`\n  ✗ ${msg}\n`);
  process.exit(1);
}

if (!BASE) fail("NEXT_PUBLIC_SUPABASE_URL is not set");
if (!SERVICE) fail("SUPABASE_SERVICE_ROLE_KEY is not set");

const headers = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };

async function rest(table, query) {
  const res = await fetch(`${BASE}/rest/v1/${table}${query}`, { headers });
  if (!res.ok) fail(`GET ${table} → ${res.status}: ${await res.text()}`);
  return res.json();
}

/* ---------- mirrors of the server-side pricing path ---------- */
/* Keep in sync with: apps/web/lib/ai/provider-routing.ts,
   apps/web/lib/pricing/adapters/fal.ts, resolution-tiers.ts, types.ts.    */

const CREDIT_CAPACITY_USD = 0.01;

function resolveEndpoint(provider, model) {
  if (!provider || !model) return null;
  const normalized = provider.replace(".", "-");
  if (normalized === "fal-ai" && model === "flux-pro")
    return "fal-ai/flux/dev/image-to-image";
  if (model.startsWith("fal-ai/")) return model;
  if (normalized === "fal-ai" && model.length > 0) return `fal-ai/${model}`;
  return null;
}

function falResolutionTier(pixels) {
  return pixels <= 1_100_000 ? "1K" : pixels <= 4_500_000 ? "2K" : "4K";
}

const TIER_MAPS = { fal_resolution: falResolutionTier };

function quoteFal(payload, envelope, slack) {
  if (payload.currency && payload.currency !== "USD")
    return { kind: "unsafe", reason: `unsupported currency ${payload.currency}` };
  const unitPrice = Number(payload.unit_price);
  switch (payload.pricing_type) {
    case "flat_per_request": {
      if (!Number.isFinite(unitPrice) || unitPrice <= 0)
        return { kind: "unsafe", reason: "invalid unit price" };
      return {
        kind: "bounded",
        expectedCostUsd: unitPrice,
        maximumCostUsd: unitPrice * slack,
        components: { unit_price: unitPrice, quantity: 1 },
      };
    }
    case "per_megapixel": {
      if (!Number.isFinite(unitPrice) || unitPrice <= 0)
        return { kind: "unsafe", reason: "invalid unit price" };
      const quantity = Math.ceil((envelope.width * envelope.height) / 1_000_000);
      const expected = unitPrice * quantity;
      return {
        kind: "bounded",
        expectedCostUsd: expected,
        maximumCostUsd: expected * slack,
        components: { unit_price: unitPrice, quantity, unit: "megapixel" },
      };
    }
    case "resolution_tier": {
      const tierFn = payload.tier_map ? TIER_MAPS[payload.tier_map] : undefined;
      const tier = tierFn ? tierFn(envelope.width * envelope.height) : null;
      if (!tier)
        return { kind: "unsafe", reason: `unknown tier map ${String(payload.tier_map)}` };
      const tierPrice = Number(payload.tiers?.[tier]);
      if (!Number.isFinite(tierPrice) || tierPrice <= 0)
        return { kind: "unsafe", reason: `no verified price for ${tier} output` };
      let expected = tierPrice;
      for (const [param, table] of Object.entries(payload.modifiers ?? {})) {
        const raw = envelope.requestConfig?.[param];
        const key = raw == null || raw === false ? "default" : String(raw);
        const surcharge = table[key];
        if (surcharge !== undefined) {
          expected += surcharge;
          continue;
        }
        const neutral =
          raw == null || raw === false || raw === 0 || raw === "false" ||
          raw === "none" || raw === "default" || raw === "off" || raw === "low";
        if (!neutral)
          return { kind: "unsafe", reason: `unpriced request param ${param}=${key}` };
      }
      return {
        kind: "bounded",
        expectedCostUsd: expected,
        maximumCostUsd: expected * slack,
        components: { tier, resolved_price: expected },
      };
    }
    default:
      return { kind: "unsafe", reason: `unsupported pricing type ${String(payload.pricing_type)}` };
  }
}

/* ---------- fetch ---------- */

const [products, snapshots, endpointStates, policies] = await Promise.all([
  rest(
    "product_versions",
    "?select=id,product_id,version_number,state,provider_strategy,model_config," +
      "output_sizes,credit_cost,products!inner(id,slug,name,public_status,visibility,type," +
      "hero_asset_id,poster_asset_id)&products.visibility=eq.public&order=version_number.asc"
  ),
  rest(
    "provider_pricing_snapshots",
    "?select=endpoint_id,fetched_at,expires_at,payload,source&provider=eq.fal&order=fetched_at.desc"
  ),
  rest("provider_endpoint_state", "?select=endpoint_id,status,suspend_reason&provider=eq.fal"),
  rest(
    "pricing_policies",
    "?select=version,quote_max_slack_factor,quote_ttl_seconds,snapshot_ttl_hours&is_active=eq.true&order=version.desc&limit=1"
  ),
]);

const policy = policies?.[0];
if (!policy) fail("no active pricing policy");
const slack = Number(policy.quote_max_slack_factor);
const now = Date.now();

const latestSnapshot = new Map();
for (const s of snapshots) if (!latestSnapshot.has(s.endpoint_id)) latestSnapshot.set(s.endpoint_id, s);
const stateByEndpoint = new Map(endpointStates.map((r) => [r.endpoint_id, r]));

function endpointReport(endpointId, envelope) {
  if (!endpointId) return { endpoint: null, verdict: "none" };
  const snap = latestSnapshot.get(endpointId);
  const state = stateByEndpoint.get(endpointId)?.status ?? "active";
  const suspendReason = stateByEndpoint.get(endpointId)?.suspend_reason ?? null;
  if (!snap)
    return { endpoint: endpointId, verdict: "dead", reason: "no pricing snapshot", state };
  const fresh = Date.parse(snap.expires_at) > now;
  if (!fresh)
    return {
      endpoint: endpointId, verdict: "dead", reason: "snapshot expired",
      expiresAt: snap.expires_at, pricingType: snap.payload?.pricing_type, state,
    };
  if (state === "suspended")
    return {
      endpoint: endpointId, verdict: "dead", reason: `suspended: ${suspendReason}`,
      pricingType: snap.payload?.pricing_type, state,
    };
  const quote = quoteFal(snap.payload, envelope, slack);
  if (quote.kind === "unsafe")
    return {
      endpoint: endpointId, verdict: "dead", reason: quote.reason,
      pricingType: snap.payload?.pricing_type, state,
      snapshotAgeH: ((now - Date.parse(snap.fetched_at)) / 3.6e6).toFixed(1),
      snapshotExpiresAt: snap.expires_at, source: snap.source,
    };
  return {
    endpoint: endpointId, verdict: "ok",
    pricingType: snap.payload.pricing_type,
    expectedUsd: quote.expectedCostUsd, maximumUsd: quote.maximumCostUsd,
    reserveCredits: Math.ceil(quote.maximumCostUsd / CREDIT_CAPACITY_USD),
    snapshotAgeH: ((now - Date.parse(snap.fetched_at)) / 3.6e6).toFixed(1),
    snapshotExpiresAt: snap.expires_at, source: snap.source, state,
  };
}

/* ---------- evaluate ---------- */

const byProduct = new Map();
for (const v of products) {
  const slug = v.products.slug;
  if (!byProduct.has(slug))
    byProduct.set(slug, { product: v.products, versions: [] });
  byProduct.get(slug).versions.push(v);
}

const results = [];
for (const { product, versions } of byProduct.values()) {
  const active = versions.filter((v) => v.state === "active")
    .sort((a, b) => b.version_number - a.version_number)[0] ?? null;
  const entry = {
    slug: product.slug,
    productStatus: product.public_status,
    versions: versions.map((v) => `v${v.version_number}:${v.state}`),
    active: null,
    verdict: "ok",
    problems: [],
  };

  const evaluateVersion = (v) => {
    const s = v.provider_strategy ?? {};
    const primary = resolveEndpoint(s.primary_provider, s.primary_model);
    const fallback = s.fallback_provider && s.fallback_model
      ? resolveEndpoint(s.fallback_provider, s.fallback_model) : null;
    const sizes = Array.isArray(v.output_sizes) && v.output_sizes.length > 0
      ? v.output_sizes
      : [{ name: "(default)", width: 1024, height: 1024 }];
    const noSizes = !(Array.isArray(v.output_sizes) && v.output_sizes.length > 0);
    const quotes = sizes.map((sz) => {
      const env2 = { width: sz.width, height: sz.height, requestConfig: v.model_config ?? {} };
      const p = endpointReport(primary, env2);
      const f = endpointReport(fallback, env2);
      const eligible =
        f.verdict === "ok" && p.verdict === "ok" && f.maximumUsd <= p.maximumUsd;
      return { size: `${sz.width}x${sz.height}`, primary: p, fallback: f, fallbackEligible: eligible };
    });
    return { version: v.version_number, primary, fallback, noSizes, modelConfig: v.model_config, quotes };
  };

  if (active) entry.active = evaluateVersion(active);
  if (ALL_VERSIONS)
    entry.otherVersions = versions.filter((v) => v !== active)
      .map((v) => ({ state: v.state, ...evaluateVersion(v) }));

  if (product.public_status !== "active") {
    entry.verdict = product.public_status; // paused/retired/draft — not launch-visible
  } else if (!active) {
    entry.verdict = "dead";
    entry.problems.push("published product has no active version");
  } else {
    if (entry.active.noSizes) entry.problems.push("active version declares no output sizes");
    if (!entry.active.primary) entry.problems.push("primary route unresolvable");
    for (const q of entry.active?.quotes ?? []) {
      if (q.primary.verdict !== "ok") entry.problems.push(`primary ${q.primary.endpoint}: ${q.primary.reason}`);
      if (q.fallback.endpoint && q.fallback.verdict !== "ok")
        entry.problems.push(`fallback ${q.fallback.endpoint}: ${q.fallback.reason}`);
      else if (q.fallback.endpoint && q.fallback.verdict === "ok" && !q.fallbackEligible)
        entry.problems.push(`fallback ${q.fallback.endpoint}: outside primary quote envelope`);
    }
    entry.problems = [...new Set(entry.problems)];
    if (entry.problems.length) entry.verdict = "dead";
  }
  results.push(entry);
}

results.sort((a, b) => a.slug.localeCompare(b.slug));

/* ---------- report ---------- */

const summary = { policy: { version: policy.version, slack, quoteTtlSeconds: policy.quote_ttl_seconds, snapshotTtlHours: policy.snapshot_ttl_hours }, auditedAt: new Date().toISOString(), products: results };

if (JSON_OUT) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`Launch route audit — ${new Date().toISOString()}`);
  console.log(`policy v${policy.version} | slack x${slack} | snapshot TTL ${policy.snapshot_ttl_hours}h | 1 credit = $${CREDIT_CAPACITY_USD}\n`);
  for (const r of results) {
    const flag = r.verdict === "ok" ? "OK  " : r.verdict === "dead" ? "DEAD" : "OFF ";
    console.log(`${flag} ${r.slug} [product:${r.productStatus}] versions: ${r.versions.join(", ")}`);
    if (r.active) {
      console.log(`     v${r.active.version} primary  → ${r.active.primary}`);
      for (const q of r.active.quotes) {
        const p = q.primary;
        const pTxt = p.verdict === "ok"
          ? `${p.pricingType} $${p.expectedUsd.toFixed(4)}–$${p.maximumUsd.toFixed(4)} (reserve ${p.reserveCredits}cr, snap ${p.snapshotAgeH}h old)`
          : `UNQUOTABLE — ${p.reason}`;
        console.log(`       ${q.size.padEnd(11)} primary: ${pTxt}`);
        if (q.fallback.endpoint) {
          const f = q.fallback;
          const fTxt = f.verdict === "ok"
            ? `${f.pricingType} max $${f.maximumUsd.toFixed(4)} → ${q.fallbackEligible ? "ELIGIBLE" : "ineligible (outside envelope)"}`
            : `INERT — ${f.reason}`;
          console.log(`       ${" ".repeat(11)} fallback ${f.endpoint}: ${fTxt}`);
        }
      }
    }
    for (const p of r.problems) console.log(`     ! ${p}`);
    if (ALL_VERSIONS) {
      for (const v of r.otherVersions ?? []) {
        console.log(`     · v${v.version} (${v.state}) primary → ${v.primary}${v.fallback ? `, fallback → ${v.fallback}` : ""}`);
      }
    }
    console.log();
  }
  const ok = results.filter((r) => r.verdict === "ok").length;
  const dead = results.filter((r) => r.verdict === "dead").length;
  const off = results.length - ok - dead;
  console.log(`== ${results.length} published products: ${ok} launch-safe, ${dead} unquotable, ${off} not customer-visible ==`);
}

process.exit(results.some((r) => r.verdict === "dead") ? 1 : 0);
