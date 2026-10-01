import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyGrowSurfSignature } from "./verify";

const SECRET = "gswhsec-test";

function sign(body: string, tsMs = Date.now(), secret = SECRET) {
  const v = createHmac("sha256", secret)
    .update(`${tsMs}.${body}`)
    .digest("hex");
  return `ts=${tsMs},v=${v}`;
}

const BODY = JSON.stringify({ event: "TEST", data: { a: 1 } });

describe("verifyGrowSurfSignature", () => {
  it("accepts a validly-signed payload", () => {
    expect(
      verifyGrowSurfSignature({
        rawBody: BODY,
        header: sign(BODY),
        secret: SECRET,
      })
    ).toBe(true);
  });

  it("rejects a wrong-secret signature", () => {
    expect(
      verifyGrowSurfSignature({
        rawBody: BODY,
        header: sign(BODY, Date.now(), "other-secret"),
        secret: SECRET,
      })
    ).toBe(false);
  });

  it("rejects a signature over a tampered body", () => {
    const header = sign(BODY);
    const tampered = BODY.replace("TEST", "EVIL");
    expect(
      verifyGrowSurfSignature({
        rawBody: tampered,
        header,
        secret: SECRET,
      })
    ).toBe(false);
  });

  it("rejects a stale timestamp beyond tolerance", () => {
    const stale = Date.now() - 10 * 60 * 1000; // 10 min ago
    expect(
      verifyGrowSurfSignature({
        rawBody: BODY,
        header: sign(BODY, stale),
        secret: SECRET,
      })
    ).toBe(false);
  });

  it("rejects malformed headers", () => {
    for (const header of [null, "", "garbage", "ts=abc,v=def", `ts=${Date.now()}`]) {
      expect(
        verifyGrowSurfSignature({ rawBody: BODY, header, secret: SECRET })
      ).toBe(false);
    }
  });

  it("rejects a non-hex signature", () => {
    const ts = Date.now();
    expect(
      verifyGrowSurfSignature({
        rawBody: BODY,
        header: `ts=${ts},v=not-hex!!!`,
        secret: SECRET,
      })
    ).toBe(false);
  });
});
