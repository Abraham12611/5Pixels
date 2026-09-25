import { describe, expect, it } from "vitest";
import {
  extForMime,
  isIosSafari,
  resultFilename,
  sanitizeDownloadFilename,
} from "../download";

const IPHONE_SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/119.0.0.0 Mobile/15E148 Safari/604.1";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36";
const MAC_SAFARI_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

describe("isIosSafari", () => {
  it("detects iPhone Safari", () => {
    expect(isIosSafari(IPHONE_SAFARI_UA, "iPhone", 5)).toBe(true);
  });

  it("excludes in-app Chrome on iOS", () => {
    expect(isIosSafari(IPHONE_CHROME_UA, "iPhone", 5)).toBe(false);
  });

  it("detects iPadOS in desktop-mode UA via touch points", () => {
    expect(isIosSafari(MAC_SAFARI_UA, "MacIntel", 5)).toBe(true);
  });

  it("rejects Android and desktop Safari", () => {
    expect(isIosSafari(ANDROID_UA, "Linux", 5)).toBe(false);
    expect(isIosSafari(MAC_SAFARI_UA, "MacIntel", 0)).toBe(false);
  });
});

describe("extForMime", () => {
  it("maps known mime types and defaults to jpg", () => {
    expect(extForMime("image/png")).toBe("png");
    expect(extForMime("image/webp")).toBe("webp");
    expect(extForMime("image/jpeg")).toBe("jpg");
    expect(extForMime(null)).toBe("jpg");
  });
});

describe("resultFilename", () => {
  it("builds a readable name from slug + id", () => {
    expect(
      resultFilename("cyber-punk", "a1b2c3d4-e5f6-7890", "image/png")
    ).toBe("5pixels-cyber-punk-a1b2c3d4.png");
  });

  it("numbers multi-output saves", () => {
    expect(resultFilename("neon", "a1b2c3d4-rest", null, 2)).toBe(
      "5pixels-neon-a1b2c3d4-3.jpg"
    );
  });
});

describe("sanitizeDownloadFilename", () => {
  it("keeps safe names, strips header-unsafe characters", () => {
    expect(sanitizeDownloadFilename("5pixels-neon-a1b2.jpg")).toBe(
      "5pixels-neon-a1b2.jpg"
    );
    expect(sanitizeDownloadFilename('bad";path\\name.png')).toBe(
      "bad-path-name.png"
    );
  });

  it("falls back to a default for empty/garbage input", () => {
    expect(sanitizeDownloadFilename('""\\\\//')).toBe("5pixels-download");
    expect(sanitizeDownloadFilename("")).toBe("5pixels-download");
  });
});
