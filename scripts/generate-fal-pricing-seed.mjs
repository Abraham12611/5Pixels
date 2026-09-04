import fs from "node:fs";
import path from "node:path";

const inputPath = path.resolve("docs/fal-ai-image-models-relevant.md");
const outputPath = path.resolve(
  "supabase/migrations/20260904100002_seed_provider_pricing.sql"
);

const content = fs.readFileSync(inputPath, "utf8").replace(/\r\n/g, "\n");
const lines = content.split("\n");

const rows = [];
let currentCategory = null;

function unescapeCell(value) {
  return value
    .replace(/\\\|/g, "|")
    .replace(/\\\\/g, "\\")
    .trim();
}

for (const line of lines) {
  if (line.startsWith("## ")) {
    currentCategory = line.replace("## ", "").trim();
    continue;
  }

  if (!line.startsWith("|") || line.includes("| ---")) {
    continue;
  }

  const rawCells = line.split("|").slice(1, -1);
  if (rawCells.length < 5) continue;

  const cells = rawCells.map((c) => unescapeCell(c));
  const [displayName, endpointId, priceStr, unit, license, ...descRest] = cells;
  const description = unescapeCell(descRest.join(" | "));

  if (priceStr === "N/A" || unit === "N/A") continue;

  const unitPrice = parseFloat(priceStr);
  if (Number.isNaN(unitPrice)) continue;

  rows.push({
    displayName: unescapeCell(displayName),
    endpointId: unescapeCell(endpointId),
    unitPrice,
    unit: unescapeCell(unit),
    license: unescapeCell(license),
    description: description.slice(0, 500),
    category: currentCategory,
  });
}

console.log(`Parsed ${rows.length} priced models.`);

const outLines = [
  "-- Seed provider_model_pricing from docs/fal-ai-image-models-relevant.md",
  "",
  "INSERT INTO public.provider_model_pricing (provider, endpoint_id, unit_price, unit, currency, is_active, metadata)",
  "VALUES",
];

for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const metadata = JSON.stringify({
    display_name: r.displayName,
    license_type: r.license,
    description: r.description,
    source_category: r.category,
  })
    .replace(/'/g, "''")
    .replace(/\\/g, "\\\\");

  const valuesLine = `  ('fal', ${sqlQuote(r.endpointId)}, ${r.unitPrice}, ${sqlQuote(r.unit)}, 'USD', true, '${metadata}'::jsonb)`;
  outLines.push(valuesLine + (i === rows.length - 1 ? ";" : ","));
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, outLines.join("\n"), "utf8");
console.log(`Wrote seed migration to ${outputPath}`);

function sqlQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}
