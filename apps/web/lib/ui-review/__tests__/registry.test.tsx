import { describe, expect, it, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import {
  POPUP_CATEGORIES,
  POPUP_REGISTRY,
} from "@/lib/ui-review/registry";
import {
  UiReviewProvider,
  UiReviewViewportProvider,
} from "@/lib/ui-review/context";

// The registry mounts ~30 client surfaces — mock every server-action module
// they touch so mounts can't reach the network.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/admin/popups",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    prefetch: _prefetch,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    prefetch?: boolean;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/offers/actions", () => ({
  recordOfferEvent: vi.fn(async () => ({ ok: true })),
  optOutOffers: vi.fn(async () => {}),
}));
vi.mock("@/lib/billing/retention", () => ({
  claimRetentionCredits: vi.fn(async () => ({ ok: true, credits: 500 })),
}));
vi.mock("@/lib/profile/actions", () => ({
  updateProfile: vi.fn(async () => ({ success: true })),
}));
vi.mock("@/lib/db/share", () => ({
  createPublicShare: vi.fn(async () => ({ shareUrl: "https://x/s/1" })),
  disablePublicShare: vi.fn(async () => true),
}));
vi.mock("@/lib/db/account", () => ({
  deleteAccount: vi.fn(async () => ({})),
}));
vi.mock("@/app/actions/auth", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithApple: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@/lib/onboarding/actions", () => ({
  checkUsername: vi.fn(async () => ({ available: true })),
  completeOnboarding: vi.fn(async () => ({ ok: true })),
  recordOnboardingEvent: vi.fn(async () => ({})),
}));
vi.mock("@/lib/referrals/actions", () => ({
  claimReferralCode: vi.fn(async () => ({ ok: true, referrerName: "Friend" })),
}));
vi.mock("@/lib/library/actions", () => ({
  deleteGeneration: vi.fn(async () => ({ ok: true })),
  markGenerationDownloaded: vi.fn(async () => {}),
  setGenerationSaved: vi.fn(async () => ({ success: true })),
}));
vi.mock("@/lib/generation/actions", () => ({
  regenerateGeneration: vi.fn(async () => ({})),
}));
vi.mock("@/lib/generation/poll", () => ({
  getResultDownloadUrls: vi.fn(async () => []),
}));
vi.mock("@/app/actions/favorites", () => ({
  toggleFavorite: vi.fn(async () => ({ success: true })),
}));
vi.mock("@/lib/db/notifications", () => ({
  markAllNotificationsRead: vi.fn(async () => {}),
  markNotificationRead: vi.fn(async () => {}),
}));
vi.mock("@/lib/articles/actions", () => ({
  archiveArticleAction: vi.fn(async () => ({ ok: true })),
  duplicateArticleAction: vi.fn(async () => ({ ok: true })),
  publishArticleAction: vi.fn(async () => ({ ok: true })),
  unarchiveArticleAction: vi.fn(async () => ({ ok: true })),
  unpublishArticleAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/lib/articles/media-actions", () => ({
  listOwnGenerationsForArticle: vi.fn(async () => ({ ok: true, data: [] })),
  publishGenerationToArticle: vi.fn(async () => ({ ok: false })),
  resolveSharedGeneration: vi.fn(async () => ({ ok: false })),
}));
vi.mock("@/lib/catalog/browser", () => ({
  fetchCatalogPage: vi.fn(async () => ({ products: [], totalCount: 0 })),
}));

describe("popup registry", () => {
  it("has unique, stable entry ids", () => {
    const ids = POPUP_REGISTRY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it("every entry has a title, valid category, and render function", () => {
    for (const entry of POPUP_REGISTRY) {
      expect(entry.title.trim().length).toBeGreaterThan(0);
      expect(POPUP_CATEGORIES).toContain(entry.category);
      expect(typeof entry.render).toBe("function");
    }
  });

  it("every category has at least one entry", () => {
    for (const category of POPUP_CATEGORIES) {
      expect(POPUP_REGISTRY.some((e) => e.category === category)).toBe(true);
    }
  });

  it("covers the full offer family", () => {
    const ids = new Set(POPUP_REGISTRY.map((e) => e.id));
    for (const required of [
      "offer-takeover",
      "blocked-subscriber",
      "blocked-weekly",
      "blocked-lapsed",
      "blocked-free",
      "blocked-new",
      "credit-topup",
      "cancel-subscription",
    ]) {
      expect(ids.has(required), `missing ${required}`).toBe(true);
    }
  });

  it.each(POPUP_REGISTRY.map((e) => [e.id, e] as const))(
    "mounts %s without throwing",
    (_id, entry) => {
      const { unmount } = render(
        <UiReviewProvider value={true}>
          <UiReviewViewportProvider value="desktop">
            {entry.render()}
          </UiReviewViewportProvider>
        </UiReviewProvider>
      );
      unmount();
      cleanup();
    }
  );

  it.each(POPUP_REGISTRY.map((e) => [e.id, e] as const))(
    "mounts %s under the mobile override",
    (_id, entry) => {
      const { unmount } = render(
        <UiReviewProvider value={true}>
          <UiReviewViewportProvider value="mobile">
            {entry.render()}
          </UiReviewViewportProvider>
        </UiReviewProvider>
      );
      unmount();
      cleanup();
    }
  );
});
