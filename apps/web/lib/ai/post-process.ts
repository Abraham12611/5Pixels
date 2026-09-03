import sharp from "sharp";

export interface PostProcessConfig {
  resize_width?: number;
  resize_height?: number;
  crop?: boolean;
  format?: "jpg" | "jpeg" | "png" | "webp";
  quality?: number;
  metadata_stripped?: boolean;
}

export interface PostProcessResult {
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
}

const FORMAT_CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Apply post-processing to a generated image buffer.
 *
 * Steps are applied in order:
 * 1. Resize (with optional crop)
 * 2. Format conversion + quality
 * 3. Metadata stripping
 */
export async function postProcessImage(
  inputBuffer: ArrayBuffer | Buffer,
  config: PostProcessConfig
): Promise<PostProcessResult> {
  const buffer =
    inputBuffer instanceof ArrayBuffer
      ? Buffer.from(inputBuffer)
      : inputBuffer;

  let pipeline = sharp(buffer, { failOn: "none" });
  const metadata = await pipeline.metadata();
  const originalWidth = metadata.width ?? 0;
  const originalHeight = metadata.height ?? 0;

  // Resize if dimensions are specified.
  if (config.resize_width || config.resize_height) {
    const targetWidth = config.resize_width ?? null;
    const targetHeight = config.resize_height ?? null;

    if (config.crop) {
      pipeline = pipeline.resize(targetWidth, targetHeight, {
        fit: "cover",
        position: "centre",
      });
    } else {
      pipeline = pipeline.resize(targetWidth, targetHeight, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }
  }

  // Format conversion + quality.
  const format = config.format ?? "webp";
  const quality = Math.min(100, Math.max(1, config.quality ?? 90));

  switch (format) {
    case "jpg":
    case "jpeg":
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case "png":
      pipeline = pipeline.png({
        quality,
        compressionLevel: 9,
      });
      break;
    case "webp":
    default:
      pipeline = pipeline.webp({ quality });
      break;
  }

  // Metadata stripping: sharp strips metadata by default unless withMetadata()
  // is called explicitly, so we only need to preserve metadata if
  // metadata_stripped is explicitly false.
  if (config.metadata_stripped === false) {
    pipeline = pipeline.withMetadata();
  }

  const outputBuffer = await pipeline.toBuffer();
  const outputMetadata = await sharp(outputBuffer).metadata();

  return {
    buffer: outputBuffer,
    contentType: FORMAT_CONTENT_TYPES[format] ?? "image/webp",
    width: outputMetadata.width ?? originalWidth,
    height: outputMetadata.height ?? originalHeight,
  };
}

/**
 * Compose a poster: overlay exact text on an AI-generated background.
 *
 * The AI produces the visual composition with a safe text area; this function
 * renders the user's exact text deterministically using SVG, then composites
 * it onto the image.
 */
export interface PosterTextOverlay {
  text: string;
  position: "top" | "center" | "bottom";
  size: "small" | "medium" | "large";
  color: string;
  alignment: "left" | "center" | "right";
  fontFamily?: string;
}

export interface PosterComposeInput {
  imageBuffer: ArrayBuffer | Buffer;
  overlays: PosterTextOverlay[];
}

const SIZE_PIXELS: Record<PosterTextOverlay["size"], number> = {
  small: 24,
  medium: 48,
  large: 72,
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function composePoster(
  input: PosterComposeInput
): Promise<PostProcessResult> {
  const buffer =
    input.imageBuffer instanceof ArrayBuffer
      ? Buffer.from(input.imageBuffer)
      : input.imageBuffer;

  const image = sharp(buffer);
  const metadata = await image.metadata();
  const width = metadata.width ?? 1024;
  const height = metadata.height ?? 1024;

  // Build SVG overlays for each text element.
  const svgParts: string[] = [];
  for (const overlay of input.overlays) {
    if (!overlay.text) continue;
    const fontSize = SIZE_PIXELS[overlay.size];
    const fontFamily = overlay.fontFamily ?? "sans-serif";
    const escapedText = escapeXml(overlay.text);

    let y: number;
    switch (overlay.position) {
      case "top":
        y = fontSize + 20;
        break;
      case "center":
        y = height / 2;
        break;
      case "bottom":
      default:
        y = height - fontSize - 20;
        break;
    }

    let x: number;
    let anchor: string;
    switch (overlay.alignment) {
      case "left":
        x = 20;
        anchor = "start";
        break;
      case "right":
        x = width - 20;
        anchor = "end";
        break;
      case "center":
      default:
        x = width / 2;
        anchor = "middle";
        break;
    }

    svgParts.push(
      `<text x="${x}" y="${y}" font-family="${escapeXml(fontFamily)}" font-size="${fontSize}" fill="${escapeXml(overlay.color)}" text-anchor="${anchor}" font-weight="bold">${escapedText}</text>`
    );
  }

  if (svgParts.length === 0) {
    // No overlays — return the original image as webp.
    const outputBuffer = await image
      .webp({ quality: 90 })
      .toBuffer();
    return {
      buffer: outputBuffer,
      contentType: "image/webp",
      width,
      height,
    };
  }

  const svgOverlay = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${svgParts.join("")}</svg>`;
  const overlayBuffer = Buffer.from(svgOverlay);

  const outputBuffer = await image
    .composite([{ input: overlayBuffer, top: 0, left: 0 }])
    .webp({ quality: 90 })
    .toBuffer();

  return {
    buffer: outputBuffer,
    contentType: "image/webp",
    width,
    height,
  };
}
