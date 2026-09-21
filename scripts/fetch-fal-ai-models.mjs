import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error("FAL_KEY environment variable is required");
  process.exit(1);
}

const HEADERS = { Authorization: `Key ${FAL_KEY}` };
const MODELS_API = "https://api.fal.ai/v1/models";
const PRICING_API = "https://api.fal.ai/v1/models/pricing";

// Search terms for image-related models. Fal search matches across
// endpoint_id, display_name, description, category and tags.
const IMAGE_QUERIES = [
  "text-to-image",
  "image-to-image",
  "image-to-video",
  "text-to-video",
  "background-removal",
  "upscale",
  "inpainting",
  "outpainting",
  "controlnet",
  "face-swap",
  "portrait",
  "style-transfer",
  "depth",
  "canny",
  "segmentation",
  "qr-code",
  "icon",
  "logo",
  "sketch",
];

const LIMIT = 100;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchModelsForQuery(query) {
  const models = [];
  let cursor = null;
  let page = 0;

  while (true) {
    const url = new URL(MODELS_API);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(LIMIT));
    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      console.warn(`  Warning: q="${query}" page ${page + 1} returned ${res.status}`);
      break;
    }

    const data = await res.json();
    for (const m of data.models ?? []) {
      models.push(m);
    }

    if (!data.has_more || !data.next_cursor) break;
    cursor = data.next_cursor;
    page++;
    // Small delay to be polite to the API.
    await sleep(150);
  }

  return models;
}

async function fetchPricing(endpointIds) {
  const pricing = [];
  const BATCH_SIZE = 50;

  for (let i = 0; i < endpointIds.length; i += BATCH_SIZE) {
    const batch = endpointIds.slice(i, i + BATCH_SIZE);
    const url = new URL(PRICING_API);
    for (const id of batch) {
      url.searchParams.append("endpoint_id", id);
    }

    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      console.warn(`  Warning: pricing batch ${i / BATCH_SIZE + 1} returned ${res.status}`);
      continue;
    }

    const data = await res.json();
    pricing.push(...(data.prices ?? []));
    await sleep(150);
  }

  return pricing;
}

function sanitizeCell(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

async function main() {
  const modelMap = new Map();

  console.log("Fetching image models from Fal API...");
  for (const query of IMAGE_QUERIES) {
    process.stdout.write(`- query: "${query}" ... `);
    const models = await fetchModelsForQuery(query);
    let added = 0;
    for (const m of models) {
      if (!modelMap.has(m.endpoint_id)) {
        modelMap.set(m.endpoint_id, m);
        added++;
      }
    }
    console.log(`${added} new, ${models.length} total from this query`);
  }

  const allModels = Array.from(modelMap.values());
  console.log(`\nCollected ${allModels.length} unique image-related models.`);

  const endpointIds = allModels.map((m) => m.endpoint_id);
  console.log(`\nFetching pricing for ${endpointIds.length} models...`);
  const prices = await fetchPricing(endpointIds);
  const priceMap = new Map(prices.map((p) => [p.endpoint_id, p]));
  console.log(`Got pricing for ${prices.length} models.`);

  // Group by category.
  const byCategory = new Map();
  for (const m of allModels) {
    const category = m.metadata?.category || "unknown";
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category).push(m);
  }

  const sortedCategories = Array.from(byCategory.keys()).sort((a, b) =>
    a.localeCompare(b)
  );

  const lines = [];
  lines.push("# Fal AI Image Models Catalog");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total models: ${allModels.length}`);
  lines.push(
    `Models with pricing: ${prices.length}`
  );
  lines.push("");
  lines.push(
    "This catalog lists image-related models available on [fal.ai](https://fal.ai) with their public API pricing in USD."
  );
  lines.push(
    "Prices are per output unit (image, megapixel, or second) and may change. Always verify on the [fal.ai pricing page](https://fal.ai/pricing) before shipping."
  );
  lines.push("");

  for (const category of sortedCategories) {
    const models = byCategory
      .get(category)
      .sort((a, b) =>
        (a.metadata?.display_name ?? a.endpoint_id).localeCompare(
          b.metadata?.display_name ?? b.endpoint_id
        )
      );

    lines.push(`## ${category}`);
    lines.push("");
    lines.push(
      "| Display Name | Endpoint ID | Price (USD) | Unit | License | Description |"
    );
    lines.push(
      "| --- | --- | --- | --- | --- | --- |"
    );

    for (const m of models) {
      const meta = m.metadata ?? {};
      const name = sanitizeCell(meta.display_name ?? m.endpoint_id);
      const endpoint = sanitizeCell(m.endpoint_id);
      const price = priceMap.get(m.endpoint_id);
      const priceStr = price ? sanitizeCell(price.unit_price) : "N/A";
      const unit = price ? sanitizeCell(price.unit) : "N/A";
      const license = sanitizeCell(meta.license_type ?? "N/A");
      const desc = sanitizeCell(
        (meta.description ?? "").slice(0, 220)
      );
      lines.push(`| ${name} | ${endpoint} | ${priceStr} | ${unit} | ${license} | ${desc} |`);
    }
    lines.push("");
  }

  const outDir = path.resolve("docs");
  const outPath = path.join(outDir, "fal-ai-image-models.md");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`\nWrote catalog to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
