import { describe, expect, it } from "vitest";
import {
  articleMediaExtension,
  articleMediaProxyUrl,
  assetUri,
  buildArticlePublishedPath,
  buildArticleStagingPath,
  extractAssetIdFromMediaUrl,
  isAllowedExternalMediaUrl,
  maxBytesForMime,
  parseArticleStagingPath,
  parseAssetUri,
  sniffArticleMediaMime,
  validateArticleMediaFile,
} from "../media";

const UID = "11111111-1111-4111-8111-111111111111";
const ARTICLE = "22222222-2222-4222-8222-222222222222";
const ASSET = "33333333-3333-4333-8333-333333333333";

describe("article media file validation", () => {
  it("accepts allowed image and video types within bounds", () => {
    expect(validateArticleMediaFile("image/jpeg", 1024)).toBe("image");
    expect(validateArticleMediaFile("image/png", 25 * 1024 * 1024)).toBe("image");
    expect(validateArticleMediaFile("image/webp", 100)).toBe("image");
    expect(validateArticleMediaFile("image/gif", 100)).toBe("image");
    expect(validateArticleMediaFile("video/mp4", 100 * 1024 * 1024)).toBe("video");
    expect(validateArticleMediaFile("video/webm", 1000)).toBe("video");
  });

  it("rejects svg, html, scripts and arbitrary types", () => {
    for (const mime of [
      "image/svg+xml",
      "text/html",
      "application/javascript",
      "application/pdf",
      "video/quicktime",
      "",
    ]) {
      expect(() => validateArticleMediaFile(mime, 100)).toThrow();
    }
  });

  it("enforces per-kind size bounds", () => {
    expect(() => validateArticleMediaFile("image/png", 25 * 1024 * 1024 + 1)).toThrow();
    expect(() => validateArticleMediaFile("video/mp4", 100 * 1024 * 1024 + 1)).toThrow();
    expect(() => validateArticleMediaFile("image/png", 0)).toThrow();
    expect(() => validateArticleMediaFile("image/png", -5)).toThrow();
    expect(maxBytesForMime("image/png")).toBe(25 * 1024 * 1024);
    expect(maxBytesForMime("video/mp4")).toBe(100 * 1024 * 1024);
  });
});

describe("storage paths", () => {
  it("builds collision-resistant owner/article-scoped staging paths", () => {
    expect(buildArticleStagingPath(UID, ARTICLE, ASSET, "image/png")).toBe(
      `staff/${UID}/articles/${ARTICLE}/${ASSET}.png`
    );
    expect(articleMediaExtension("video/webm")).toBe("webm");
    expect(articleMediaExtension("image/svg+xml")).toBeNull();
  });

  it("builds immutable published paths", () => {
    expect(buildArticlePublishedPath(ARTICLE, ASSET, "png")).toBe(
      `articles/${ARTICLE}/${ASSET}.png`
    );
    expect(() => buildArticlePublishedPath(ARTICLE, ASSET, "svg")).toThrow();
  });

  it("rejects path traversal and malformed ids", () => {
    expect(() =>
      buildArticleStagingPath("../x", ARTICLE, ASSET, "image/png")
    ).toThrow();
    expect(() =>
      buildArticleStagingPath(UID, ARTICLE, ASSET, "text/html")
    ).toThrow();
    expect(parseArticleStagingPath("staff/../articles/x/y.png")).toBeNull();
    expect(
      parseArticleStagingPath(`staff\\${UID}\\articles\\${ARTICLE}\\${ASSET}.png`)
    ).toBeNull();
    expect(
      parseArticleStagingPath(
        `staff/${UID}/articles/${ARTICLE}/${ASSET}.png`
      )
    ).toEqual({ uploaderId: UID, articleId: ARTICLE, assetId: ASSET });
  });
});

describe("asset URIs and media URLs", () => {
  it("round-trips asset:// references", () => {
    const uri = assetUri(ASSET);
    expect(uri).toBe(`asset://${ASSET}`);
    expect(parseAssetUri(uri)).toBe(ASSET);
    expect(parseAssetUri("asset://not-a-uuid")).toBeNull();
    expect(parseAssetUri("https://evil.example/asset")).toBeNull();
  });

  it("extracts asset ids from proxy URLs", () => {
    const proxy = articleMediaProxyUrl(ASSET, { width: 400 });
    expect(proxy).toBe(`/api/articles/media/${ASSET}?w=400`);
    expect(extractAssetIdFromMediaUrl(proxy)).toBe(ASSET);
    expect(extractAssetIdFromMediaUrl(`/api/articles/media/${ASSET}`)).toBe(ASSET);
  });

  it("rejects obviously hostile references", () => {
    expect(() => assetUri("not-a-uuid")).toThrow();
    expect(extractAssetIdFromMediaUrl("javascript:alert(1)")).toBeNull();
    expect(extractAssetIdFromMediaUrl("data:text/html,<script>")).toBeNull();
  });
});

describe("external url allowlist", () => {
  it("allows nothing by default and never http", () => {
    expect(isAllowedExternalMediaUrl("https://cdn.example.com/x.png")).toBe(
      false
    );
    expect(isAllowedExternalMediaUrl("http://cdn.example.com/x.png")).toBe(
      false
    );
    expect(isAllowedExternalMediaUrl("not a url")).toBe(false);
  });
});

describe("magic-byte sniffing", () => {
  const sniff = (bytes: number[]) =>
    sniffArticleMediaMime(new Uint8Array(bytes));

  it("detects jpeg, png, gif, webp, mp4 and webm", () => {
    expect(sniff([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(
      "image/jpeg"
    );
    expect(
      sniff([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
    ).toBe("image/png");
    expect(sniff([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0])).toBe(
      "image/gif"
    );
    expect(
      sniff([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
    ).toBe("image/webp");
    expect(
      sniff([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d])
    ).toBe("video/mp4");
    expect(sniff([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(
      "video/webm"
    );
  });

  it("rejects svg and html disguised as images", () => {
    // "<svg xmlns..." and "<!DOCTYPE html" never sniff into an allowed type.
    const svg = new TextEncoder().encode("<svg xmlns='http://");
    const html = new TextEncoder().encode("<!DOCTYPE html");
    expect(sniffArticleMediaMime(svg)).toBeNull();
    expect(sniffArticleMediaMime(html)).toBeNull();
    expect(sniffArticleMediaMime(new Uint8Array(4))).toBeNull();
  });
});
