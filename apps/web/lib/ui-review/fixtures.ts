/**
 * Fabricated fixtures for the admin popup inspector (/admin/popups). Every
 * value here is inert — fake ids fail closed server-side, and surfaces mounted
 * under `UiReviewProvider` suppress their side-effect calls.
 */
import type { PlanForPurchase } from "@/lib/db/plans";
import type { CreditPack } from "@/lib/billing/credit-packs";
import type { OfferAssignment } from "@/lib/offers/engine";
import type { ResumePlan } from "@/lib/billing/segments";
import type { NotificationItem } from "@/lib/db/notifications";
import type { QuickSheetPreset } from "@/lib/catalog/quick-sheet";
import type { FamilyRailMember } from "@/lib/catalog/family";
import type {
  SearchPreset,
  SearchCategory,
  SearchLibraryItem,
} from "@/lib/search";
import type { LibraryItem } from "@/components/consumer/library-grid";
import type { StaffArticle } from "@/lib/articles/types";
import type { InterestTile } from "@/components/onboarding/onboarding-flow";
import type { ActivePlan } from "@/lib/billing/entitlements";
import type { CookieConsent } from "@/lib/consent/cookies";

export const THUMB = "/landing/cat-cinematic.jpg";
export const THUMB_ALT = "/landing/cat-illustration.jpg";
export const THUMB_THIRD = "/landing/cat-portraits.jpg";
export const AVATAR = "/avatars/avatar-01-robot-mascot.jpg";

export const PLANS: PlanForPurchase[] = [
  {
    id: "pv-week-starter",
    slug: "weekly-starter",
    name: "Weekly Trial — Starter",
    type: "weekly_trial",
    price_cents: 500,
    credits_grant: 500,
    markup_multiplier: 4,
    interval: "one_time",
    is_trial: true,
    can_repurchase: false,
    checkout_ready: true,
  },
  {
    id: "pv-week-plus",
    slug: "weekly-plus",
    name: "Weekly Trial — Plus",
    type: "weekly_trial",
    price_cents: 1000,
    credits_grant: 1200,
    markup_multiplier: 3.5,
    interval: "one_time",
    is_trial: true,
    can_repurchase: false,
    checkout_ready: true,
  },
  {
    id: "pv-annual",
    slug: "annual-pro",
    name: "Pro Annual",
    type: "annual",
    price_cents: 54000,
    credits_grant: 60000,
    markup_multiplier: 2.5,
    interval: "year",
    is_trial: false,
    can_repurchase: true,
    checkout_ready: true,
  },
  {
    id: "pv-monthly",
    slug: "monthly-pro",
    name: "Pro Monthly",
    type: "monthly",
    price_cents: 2000,
    credits_grant: 4000,
    markup_multiplier: 3,
    interval: "month",
    is_trial: false,
    can_repurchase: true,
    checkout_ready: true,
  },
  {
    id: "pv-extra",
    slug: "extra-credits",
    name: "Extra Credits",
    type: "extra_credit",
    price_cents: 800,
    credits_grant: 800,
    markup_multiplier: 4,
    interval: "one_time",
    is_trial: false,
    can_repurchase: true,
    checkout_ready: true,
  },
];

export const CREDIT_PACKS: CreditPack[] = [
  { planId: "pv-pack-s", priceCents: 400, credits: 400, checkoutReady: true },
  { planId: "pv-pack-m", priceCents: 800, credits: 900, checkoutReady: true },
  { planId: "pv-pack-l", priceCents: 1500, credits: 2000, checkoutReady: true },
  { planId: "pv-pack-xl", priceCents: 2800, credits: 4200, checkoutReady: true },
];

export const OFFER_ASSIGNMENT: OfferAssignment = {
  campaignId: "pv-campaign",
  campaignSlug: "preview-campaign",
  variant: "A",
  isAdminPreview: true,
  steps: [
    { position: 1, kind: "weekly_pair", payload: {} },
    {
      position: 2,
      kind: "discount",
      payload: {
        headline: "Limited-time discount",
        deadline_display: "countdown",
        ends_at: new Date(Date.now() + 1000 * 60 * 60 * 23).toISOString(),
      },
    },
    { position: 3, kind: "referral", payload: {} },
  ],
};

export const RESUME_PLAN: ResumePlan = {
  id: "pv-annual",
  name: "Pro Annual",
  priceCents: 54000,
  creditsGrant: 60000,
  interval: "year",
};

export const NOTIFICATIONS: NotificationItem[] = [
  {
    id: "pv-n1",
    type: "generation",
    title: "Your Cinematic Cat result is ready",
    body: "Tap to view the finished image.",
    link: "/app/library",
    read_at: null,
    created_at: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
  },
  {
    id: "pv-n2",
    type: "billing",
    title: "2000 credits added",
    body: "Your Pro Monthly plan renewed.",
    link: "/app/billing",
    read_at: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "pv-n3",
    type: "system",
    title: "New looks this week",
    body: "Three new filters dropped in Explore.",
    link: null,
    read_at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
  },
];

export const QUICK_PRESET: QuickSheetPreset = {
  id: "pv-preset-1",
  slug: "cinematic-cat",
  name: "Cinematic Cat",
  type: "filter",
  shortDescription: "Film-grade fur and dramatic light.",
  categoryName: "Portraits",
  categorySlug: "portraits",
  creditCost: 3,
  previewUrl: THUMB,
  previewVideoUrl: null,
  exampleUrls: [THUMB, THUMB_ALT, THUMB_THIRD],
  available: true,
};

export const FAMILY_MEMBERS: FamilyRailMember[] = Array.from(
  { length: 9 },
  (_, i) => ({
    productId: `pv-family-${i}`,
    slug: `cinematic-cat-${i}`,
    name: `Cinematic Cat ${i === 0 ? "" : `· Variant ${i}`}`,
    label: i === 0 ? "Cinematic Cat" : `Variant ${i}`,
    isParent: i === 0,
    isCurrent: i === 0,
    available: true,
    creditCost: 3,
    previewUrl: [THUMB, THUMB_ALT, THUMB_THIRD][i % 3]!,
    inputCapability: null,
  })
);

export const SEARCH_PRESETS: SearchPreset[] = [
  {
    slug: "cinematic-cat",
    name: "Cinematic Cat",
    description: "Film-grade fur and dramatic light.",
    categoryName: "Portraits",
    categorySlug: "portraits",
    type: "filter",
    creditCost: 3,
    thumbUrl: THUMB,
    badge: null,
  },
  {
    slug: "noir-poster",
    name: "Noir Poster",
    description: "High-contrast poster with title text.",
    categoryName: "Posters",
    categorySlug: "posters",
    type: "poster",
    creditCost: 5,
    thumbUrl: THUMB_ALT,
    badge: null,
  },
];

export const SEARCH_CATEGORIES: SearchCategory[] = [
  { slug: "portraits", name: "Portraits" },
  { slug: "posters", name: "Posters" },
];

export const SEARCH_LIBRARY: SearchLibraryItem[] = [
  {
    id: "pv-lib-1",
    productName: "Cinematic Cat",
    productSlug: "cinematic-cat",
    status: "succeeded",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    thumbUrl: THUMB_THIRD,
  },
];

export const LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: "pv-lib-1",
    productName: "Cinematic Cat",
    productSlug: "cinematic-cat",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    savedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    downloadedAt: null,
    outputUrl: THUMB,
    outputWidth: 1024,
    outputHeight: 1280,
  },
  {
    id: "pv-lib-2",
    productName: "Noir Poster",
    productSlug: "noir-poster",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
    savedAt: null,
    downloadedAt: null,
    outputUrl: THUMB_ALT,
    outputWidth: 1024,
    outputHeight: 1024,
  },
];

export const STAFF_ARTICLE: StaffArticle = {
  id: "pv-article-1",
  author_id: null,
  title: "How to make your cat look cinematic",
  slug: "cinematic-cat-guide",
  summary: "A short guide to the Cinematic Cat preset.",
  cover_asset_id: null,
  topic: "guides",
  tags: ["cats", "cinematic"],
  status: "draft",
  draft_content: [],
  schema_version: 1,
  edit_version: 3,
  last_edited_by: null,
  current_publication_id: null,
  first_published_at: null,
  published_at: null,
  created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  updated_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  author_email: null,
  editor_email: null,
};

export const INTEREST_TILES: InterestTile[] = [
  { slug: "portraits", name: "Portraits", imageUrl: THUMB },
  { slug: "posters", name: "Posters", imageUrl: THUMB_ALT },
  { slug: "pets", name: "Pets", imageUrl: THUMB_THIRD },
  { slug: "food", name: "Food", imageUrl: null },
];

export const ACTIVE_PLAN: ActivePlan = {
  planId: "pv-annual",
  slug: "annual-pro",
  name: "Pro Annual",
  type: "annual",
  creditsGrant: 60000,
  currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
};

export const CONSENT: CookieConsent = {
  version: 1,
  essential: true,
  functional: true,
  analytics: false,
  advertising: false,
  updatedAt: new Date().toISOString(),
};

export const CATEGORIES = [
  { slug: "portraits", name: "Portraits" },
  { slug: "posters", name: "Posters" },
  { slug: "pets", name: "Pets" },
];
