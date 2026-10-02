import { describe, expect, it } from "vitest";
import {
  classifySourceDimensions,
  classifySourceFile,
  SOURCE_MAX_ASPECT,
  SOURCE_MAX_BYTES,
  SOURCE_MIN_DIMENSION,
} from "../validation";

describe("classifySourceFile", () => {
  it("rejects unsupported types with a re-pickable message", () => {
    const verdict = classifySourceFile({ type: "image/gif", size: 1000 });
    expect(verdict.class).toBe("rejected");
    expect(verdict.message).toMatch(/JPEG, PNG, or WebP/);
  });

  it("rejects files over the size cap", () => {
    const verdict = classifySourceFile({
      type: "image/jpeg",
      size: SOURCE_MAX_BYTES + 1,
    });
    expect(verdict.class).toBe("rejected");
    expect(verdict.message).toMatch(/20 MB/);
  });

  it("accepts a valid file", () => {
    expect(
      classifySourceFile({ type: "image/webp", size: 1024 }).class
    ).toBe("accepted");
    expect(
      classifySourceFile({ type: "image/jpeg", size: SOURCE_MAX_BYTES })
        .class
    ).toBe("accepted");
  });
});

describe("classifySourceDimensions", () => {
  it("warns on a very small photo without blocking", () => {
    const verdict = classifySourceDimensions({
      width: SOURCE_MIN_DIMENSION - 1,
      height: 1200,
    });
    expect(verdict.class).toBe("warning");
    expect(verdict.message).toMatch(/small/i);
  });

  it("warns on an extreme aspect ratio without blocking", () => {
    const verdict = classifySourceDimensions({
      width: SOURCE_MIN_DIMENSION * (SOURCE_MAX_ASPECT + 1),
      height: SOURCE_MIN_DIMENSION,
    });
    expect(verdict.class).toBe("warning");
    expect(verdict.message).toMatch(/shape/i);
  });

  it("accepts ordinary dimensions", () => {
    expect(
      classifySourceDimensions({ width: 1024, height: 1024 }).class
    ).toBe("accepted");
    expect(
      classifySourceDimensions({ width: 3000, height: 2000 }).class
    ).toBe("accepted");
  });

  it("stays quiet when dimensions are unknown", () => {
    expect(classifySourceDimensions({ width: 0, height: 0 }).class).toBe(
      "accepted"
    );
  });
});
