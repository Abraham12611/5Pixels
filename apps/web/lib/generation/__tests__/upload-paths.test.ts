import { describe, expect, it } from "vitest";
import { isOwnedUserPath, buildOutputPath } from "../paths";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const FILE_ID = "22222222-2222-2222-2222-222222222222";

describe("isOwnedUserPath", () => {
  it("accepts user-owned source paths", () => {
    expect(isOwnedUserPath(USER_ID, `${USER_ID}/sources/${FILE_ID}.jpg`)).toBe(
      true
    );
  });

  it("accepts user-owned output paths", () => {
    expect(isOwnedUserPath(USER_ID, `${USER_ID}/outputs/${FILE_ID}.png`)).toBe(
      true
    );
  });

  it("rejects paths outside the user folder", () => {
    expect(
      isOwnedUserPath(
        USER_ID,
        `22222222-2222-2222-2222-222222222222/sources/${FILE_ID}.jpg`
      )
    ).toBe(false);
  });

  it("rejects paths not under sources/outputs", () => {
    expect(isOwnedUserPath(USER_ID, `${USER_ID}/private/${FILE_ID}.jpg`)).toBe(
      false
    );
  });

  it("rejects path traversal", () => {
    expect(
      isOwnedUserPath(USER_ID, `${USER_ID}/sources/../other/${FILE_ID}.jpg`)
    ).toBe(false);
  });
});

describe("buildOutputPath", () => {
  it("puts outputs under the user folder", () => {
    const path = buildOutputPath(USER_ID, "image/webp");
    expect(path.startsWith(`${USER_ID}/outputs/`)).toBe(true);
    expect(path.endsWith(".webp")).toBe(true);
  });

  it("defaults to png for non-webp content types", () => {
    const path = buildOutputPath(USER_ID, "image/jpeg");
    expect(path.endsWith(".png")).toBe(true);
  });
});
