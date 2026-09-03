import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { postProcessImage, composePoster } from "../post-process";

async function makeTestImage(
  width: number,
  height: number,
  color: { r: number; g: number; b: number }
): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: color,
    },
  })
    .png()
    .toBuffer();
}

describe("postProcessImage", () => {
  it("converts PNG to WebP", async () => {
    const input = await makeTestImage(100, 100, { r: 255, g: 0, b: 0 });
    const result = await postProcessImage(input, {
      format: "webp",
      quality: 80,
    });
    expect(result.contentType).toBe("image/webp");
    expect(result.buffer.byteLength).toBeGreaterThan(0);
  });

  it("resizes to a smaller width while preserving aspect ratio", async () => {
    const input = await makeTestImage(200, 100, { r: 0, g: 255, b: 0 });
    const result = await postProcessImage(input, {
      resize_width: 100,
      format: "png",
    });
    expect(result.width).toBe(100);
    expect(result.height).toBeLessThanOrEqual(50);
  });

  it("crops to exact dimensions when crop is true", async () => {
    const input = await makeTestImage(200, 200, { r: 0, g: 0, b: 255 });
    const result = await postProcessImage(input, {
      resize_width: 100,
      resize_height: 100,
      crop: true,
      format: "png",
    });
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
  });

  it("does not enlarge when resize target is larger without crop", async () => {
    const input = await makeTestImage(50, 50, { r: 128, g: 128, b: 128 });
    const result = await postProcessImage(input, {
      resize_width: 200,
      resize_height: 200,
      crop: false,
      format: "png",
    });
    expect(result.width).toBe(50);
    expect(result.height).toBe(50);
  });

  it("converts to JPEG", async () => {
    const input = await makeTestImage(50, 50, { r: 255, g: 128, b: 0 });
    const result = await postProcessImage(input, {
      format: "jpeg",
      quality: 70,
    });
    expect(result.contentType).toBe("image/jpeg");
  });
});

describe("composePoster", () => {
  it("returns the image as webp when no overlays are provided", async () => {
    const input = await makeTestImage(100, 100, { r: 0, g: 0, b: 0 });
    const result = await composePoster({
      imageBuffer: input,
      overlays: [],
    });
    expect(result.contentType).toBe("image/webp");
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
  });

  it("composites text overlays onto the image", async () => {
    const input = await makeTestImage(200, 200, { r: 20, g: 20, b: 20 });
    const result = await composePoster({
      imageBuffer: input,
      overlays: [
        {
          text: "Hello World",
          position: "bottom",
          size: "medium",
          color: "#FFFFFF",
          alignment: "center",
        },
      ],
    });
    expect(result.contentType).toBe("image/webp");
    expect(result.width).toBe(200);
    expect(result.height).toBe(200);
    expect(result.buffer.byteLength).toBeGreaterThan(0);
  });

  it("escapes XML special characters in text", async () => {
    const input = await makeTestImage(100, 100, { r: 0, g: 0, b: 0 });
    // This should not throw even with special characters
    const result = await composePoster({
      imageBuffer: input,
      overlays: [
        {
          text: "<script>alert('xss')</script>",
          position: "top",
          size: "small",
          color: "#FF0000",
          alignment: "left",
        },
      ],
    });
    expect(result.buffer.byteLength).toBeGreaterThan(0);
  });
});
