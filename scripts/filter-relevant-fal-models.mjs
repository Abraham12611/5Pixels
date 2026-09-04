import fs from "node:fs";
import path from "node:path";

const RELEVANT_CATEGORIES = [
  "image-to-image",
  "text-to-image",
];

const inputPath = path.resolve("docs/fal-ai-image-models.md");
const outputPath = path.resolve("docs/fal-ai-image-models-relevant.md");

const content = fs.readFileSync(inputPath, "utf8");
const lines = content.split("\n");

const outLines = [];
let inHeader = true;
let inRelevantSection = false;
let currentCategory = null;
let keptSections = 0;
let modelCount = 0;

function isDataRow(line) {
  return line.startsWith("|") && !line.startsWith("| ---");
}

function countDataRows(startIndex) {
  let count = 0;
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) break;
    if (isDataRow(line)) count++;
  }
  return count;
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (inHeader) {
    // Copy the title and description, but replace the total line.
    if (line.startsWith("# ")) {
      outLines.push("# Fal AI Image Models Relevant to 5Pixels");
      outLines.push("");
      outLines.push(
        "A filtered view of the [full Fal AI catalog](./fal-ai-image-models.md), limited to image generation and editing models that are directly relevant to the 5Pixels preset-first image transformation product."
      );
      outLines.push("");
      outLines.push(
        "Use this file for credit-to-dollar and gross-margin calculations. Prices are per output unit and may change; verify on [fal.ai/pricing](https://fal.ai/pricing) before finalizing business logic."
      );
      outLines.push("");
      continue;
    }
    if (line.startsWith("Generated:")) {
      // Keep the generated line.
      outLines.push(line);
      continue;
    }
    if (line.startsWith("Total models:")) {
      // We will replace this after counting.
      continue;
    }
    if (line.startsWith("Models with pricing:")) {
      continue;
    }
    if (line.startsWith("This catalog lists")) {
      continue;
    }
    if (line.startsWith("Prices are per output")) {
      continue;
    }
    if (line.startsWith("## ")) {
      inHeader = false;
    } else {
      continue;
    }
  }

  if (line.startsWith("## ")) {
    currentCategory = line.replace("## ", "").trim();
    inRelevantSection = RELEVANT_CATEGORIES.includes(currentCategory);
    if (inRelevantSection) {
      if (keptSections > 0) outLines.push("");
      outLines.push(line);
      keptSections++;
    }
    continue;
  }

  if (inRelevantSection) {
    outLines.push(line);
    if (isDataRow(line)) {
      modelCount++;
    }
  }
}

// Insert counts after the header.
const generatedIndex = outLines.findIndex((l) => l.startsWith("Generated:"));
if (generatedIndex >= 0) {
  outLines.splice(
    generatedIndex + 1,
    0,
    `Total relevant models: ${modelCount}`,
    `Source: docs/fal-ai-image-models.md`
  );
} else {
  outLines.splice(4, 0, `Total relevant models: ${modelCount}`);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, outLines.join("\n"), "utf8");
console.log(`Wrote ${modelCount} relevant models to ${outputPath}`);
