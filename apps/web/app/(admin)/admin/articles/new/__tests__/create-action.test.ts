import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminOrOwner: vi.fn(),
  createArticleAction: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/db/admin", () => ({
  requireAdminOrOwner: mocks.requireAdminOrOwner,
}));
vi.mock("@/lib/articles/actions", () => ({
  createArticleAction: mocks.createArticleAction,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { createAndOpenArticleAction } from "../create-action";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdminOrOwner.mockResolvedValue({});
  // Next.js redirect() terminates the Server Action by throwing NEXT_REDIRECT.
  mocks.redirect.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
});

describe("createAndOpenArticleAction", () => {
  it("creates a draft and redirects the staff author to its editor", async () => {
    mocks.createArticleAction.mockResolvedValue({
      ok: true,
      article: { id: "new-article-id" },
    });

    await expect(createAndOpenArticleAction()).rejects.toThrow(
      "NEXT_REDIRECT"
    );

    expect(mocks.requireAdminOrOwner).toHaveBeenCalledOnce();
    expect(mocks.createArticleAction).toHaveBeenCalledOnce();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/admin/articles/new-article-id/edit"
    );
  });

  it("redirects back to a retryable new-article screen if creation fails", async () => {
    mocks.createArticleAction.mockResolvedValue({
      ok: false,
      code: "unknown",
      error: "Database unavailable",
    });

    await expect(createAndOpenArticleAction()).rejects.toThrow(
      "NEXT_REDIRECT"
    );

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/admin/articles/new?error=create"
    );
  });

  it("does not mutate the database without staff authorization", async () => {
    mocks.requireAdminOrOwner.mockRejectedValue(new Error("Not authorized"));

    await expect(createAndOpenArticleAction()).rejects.toThrow(
      "Not authorized"
    );
    expect(mocks.createArticleAction).not.toHaveBeenCalled();
  });
});
