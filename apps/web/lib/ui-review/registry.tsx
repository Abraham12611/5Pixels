"use client";

import { useState, type ReactNode } from "react";
import { SpecialOfferTakeover } from "@/components/promo/special-offer-takeover";
import { BlockedCreditSurface } from "@/components/consumer/blocked-credit-surface";
import { CancelSubscriptionCard } from "@/components/consumer/cancel-subscription-card";
import { CreditTopUp } from "@/components/consumer/credit-top-up";
import { CreditConfirmDialog } from "@/components/consumer/credit-confirm-dialog";
import { TrialBanner } from "@/components/promo/trial-banner";
import { ReferralCard } from "@/components/promo/referral-card";
import { BlurredResultStage } from "@/components/promo/blurred-result-stage";
import { AuthModal } from "@/components/auth/auth-modal";
import { ShareDialog } from "@/components/consumer/share-dialog";
import { EditAccountDialog } from "@/components/consumer/edit-account-dialog";
import { CreateSheet } from "@/components/consumer/create-sheet";
import { PresetQuickSheet } from "@/components/consumer/preset-quick-sheet";
import { LibraryFilterModal } from "@/components/consumer/library-filter-modal";
import { FilterModal } from "@/components/consumer/mobile/filter-modal";
import { PresetFamilySelector } from "@/components/consumer/preset-family-selector";
import { ResultActions } from "@/components/consumer/result-actions";
import { LibraryResultCard } from "@/components/consumer/library-result-card";
import { ImageViewer } from "@/components/consumer/mobile/image-viewer";
import { SearchPalette } from "@/components/consumer/search-palette";
import { NotificationDropdown } from "@/components/consumer/notification-dropdown";
import { DeleteAccountFlow } from "@/app/(app)/app/account/delete/delete-account-flow";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { CookieBanner } from "@/components/consent/cookie-banner";
import { CookieSettingsModal } from "@/components/consent/cookie-settings-modal";
import { CategoryManager } from "@/components/admin/category-manager";
import { VersionRollback } from "@/components/admin/version-rollback";
import { ProductActions } from "@/components/admin/product-actions";
import { ArticleRowActions } from "@/components/articles/studio/article-row-actions";
import { PresetPicker } from "@/components/articles/blocks/preset-picker";
import { GenerationChooser } from "@/components/articles/media/generation-chooser";
import type { QuickSheetPreset } from "@/lib/catalog/quick-sheet";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DEFAULT_LIBRARY_FILTERS } from "@/lib/library/filters";
import { deriveTeaserVariant } from "@/lib/teaser/variant";
import {
  ACTIVE_PLAN,
  AVATAR,
  CATEGORIES,
  CONSENT,
  CREDIT_PACKS,
  FAMILY_MEMBERS,
  INTEREST_TILES,
  LIBRARY_ITEMS,
  NOTIFICATIONS,
  OFFER_ASSIGNMENT,
  PLANS,
  QUICK_PRESET,
  RESUME_PLAN,
  SEARCH_CATEGORIES,
  SEARCH_LIBRARY,
  SEARCH_PRESETS,
  STAFF_ARTICLE,
  THUMB,
  THUMB_ALT,
} from "./fixtures";

export type PopupCategory =
  | "Offers & billing"
  | "Consumer dialogs"
  | "Mobile & sheets"
  | "Consent"
  | "Admin & editorial";

export interface PopupEntry {
  id: string;
  title: string;
  category: PopupCategory;
  /** What this surface is / how to reach it in product. */
  note?: string;
  /** Mount the surface. Each entry remounts fresh per selection. */
  render: () => ReactNode;
}

const noop = () => {};
const asyncNoop = async () => {};
// Simulate successful admin actions in the inert popup inspector; never write.
const asyncSuccessNoop = async () => ({ ok: true as const });

/** `open`-controlled surfaces — mount open, allow dismiss + reopen. */
function Mountable({
  children,
}: {
  children: (open: boolean, setOpen: (v: boolean) => void) => ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <>
      {children(open, setOpen)}
      {!open && (
        <div className="text-center">
          <p className="text-text-muted mb-3 text-sm">Surface closed.</p>
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            Reopen
          </Button>
        </div>
      )}
    </>
  );
}

/** PresetQuickSheet closes by nulling its item, not an `open` flag. */
function QuickSheetMount() {
  const [item, setItem] = useState(QUICK_PRESET as QuickSheetPreset | null);
  return (
    <>
      <PresetQuickSheet
        item={item}
        onOpenChange={(o) => {
          if (!o) setItem(null);
        }}
        isAuthenticated
        returnPath="/admin/popups"
      />
      {item === null && (
        <div className="text-center">
          <p className="text-text-muted mb-3 text-sm">Surface closed.</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setItem(QUICK_PRESET)}
          >
            Reopen
          </Button>
        </div>
      )}
    </>
  );
}

/** Trigger-based surfaces (card → internal dialog). Mount the trigger so the
 *  admin sees the entry point too. */
function TriggerMount({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md">
      <p className="text-text-muted mb-4 text-center text-xs">
        This surface mounts its own trigger — interact to open the overlay.
      </p>
      {children}
    </div>
  );
}

const topUpInfo = { packs: CREDIT_PACKS, creditsPerTransformation: 3 };

export const POPUP_REGISTRY: PopupEntry[] = [
  // -------------------------------------------------------------- Offers
  {
    id: "offer-takeover",
    title: "Special offer takeover",
    category: "Offers & billing",
    note: "Post-signup / campaign ladder — weekly → discount → referral. Decline advances steps inside the same card.",
    render: () => (
      <SpecialOfferTakeover
        assignment={OFFER_ASSIGNMENT}
        plans={PLANS}
        referralCode="PV1234"
        onClose={noop}
      />
    ),
  },
  {
    id: "blocked-subscriber",
    title: "Blocked — subscriber top-up",
    category: "Offers & billing",
    note: "Active plan, out of credits — top-up only, no offer ladder.",
    render: () => (
      <Mountable>
        {(open, setOpen) => (
          <BlockedCreditSurface
            open={open}
            onOpenChange={setOpen}
            segment="subscriber"
            offer={null}
            plans={PLANS}
            required={3}
            balance={0}
            presetName="Cinematic Cat"
            presetThumbUrl={THUMB}
            topUp={topUpInfo}
            activePlanName="Pro Annual"
          />
        )}
      </Mountable>
    ),
  },
  {
    id: "blocked-canceling",
    title: "Blocked — canceling plan",
    category: "Offers & billing",
    note: "Plan is cancel_at_period_end — top-up + restart nudge.",
    render: () => (
      <Mountable>
        {(open, setOpen) => (
          <BlockedCreditSurface
            open={open}
            onOpenChange={setOpen}
            segment="canceling"
            offer={null}
            plans={PLANS}
            required={3}
            balance={0}
            presetName="Cinematic Cat"
            presetThumbUrl={THUMB}
            topUp={topUpInfo}
            activePlanName="Pro Annual"
            planEndsAt={new Date(Date.now() + 86400000 * 12).toISOString()}
          />
        )}
      </Mountable>
    ),
  },
  {
    id: "blocked-weekly",
    title: "Blocked — weekly buyer",
    category: "Offers & billing",
    note: "Only ever bought weekly passes — 'Get another week'.",
    render: () => (
      <Mountable>
        {(open, setOpen) => (
          <BlockedCreditSurface
            open={open}
            onOpenChange={setOpen}
            segment="weekly_buyer"
            offer={null}
            plans={PLANS}
            required={3}
            balance={0}
            presetName="Cinematic Cat"
            presetThumbUrl={THUMB}
            topUp={topUpInfo}
          />
        )}
      </Mountable>
    ),
  },
  {
    id: "blocked-lapsed",
    title: "Blocked — lapsed subscriber",
    category: "Offers & billing",
    note: "Past paid plan — reactivation card preselects their old plan.",
    render: () => (
      <Mountable>
        {(open, setOpen) => (
          <BlockedCreditSurface
            open={open}
            onOpenChange={setOpen}
            segment="lapsed"
            offer={null}
            plans={PLANS}
            required={3}
            balance={0}
            presetName="Cinematic Cat"
            presetThumbUrl={THUMB}
            topUp={topUpInfo}
            resumePlan={RESUME_PLAN}
          />
        )}
      </Mountable>
    ),
  },
  {
    id: "blocked-free",
    title: "Blocked — free with history",
    category: "Offers & billing",
    note: "Never paid, has generations — contextual paywall; Cancel passes through to the offer ladder.",
    render: () => (
      <Mountable>
        {(open, setOpen) => (
          <BlockedCreditSurface
            open={open}
            onOpenChange={setOpen}
            segment="free_history"
            offer={OFFER_ASSIGNMENT}
            plans={PLANS}
            required={3}
            balance={0}
            presetName="Cinematic Cat"
            presetThumbUrl={THUMB}
            topUp={topUpInfo}
            referralCode="PV1234"
          />
        )}
      </Mountable>
    ),
  },
  {
    id: "blocked-new",
    title: "Blocked — new user offer",
    category: "Offers & billing",
    note: "Never paid, no generations — surface opens on the offer ladder.",
    render: () => (
      <Mountable>
        {(open, setOpen) => (
          <BlockedCreditSurface
            open={open}
            onOpenChange={setOpen}
            segment="new_user"
            offer={OFFER_ASSIGNMENT}
            plans={PLANS}
            required={3}
            balance={0}
            presetName="Cinematic Cat"
            presetThumbUrl={THUMB}
            topUp={topUpInfo}
            referralCode="PV1234"
          />
        )}
      </Mountable>
    ),
  },
  {
    id: "credit-topup",
    title: "Credit top-up",
    category: "Offers & billing",
    note: "Pack picker — embedded inside the blocked surface's top-up view.",
    render: () => (
      <Mountable>
        {(open, setOpen) => (
          <Dialog open={open} onOpenChange={setOpen} className="max-w-[520px]">
            <DialogContent>
              <DialogTitle className="font-display text-cream-50 text-2xl font-bold">
                Keep creating.
              </DialogTitle>
              <p className="text-text-secondary mt-1 mb-4 text-sm">
                Add credits to finish your look. Choose an amount below.
              </p>
              <CreditTopUp packs={CREDIT_PACKS} creditsPerTransformation={3} />
            </DialogContent>
          </Dialog>
        )}
      </Mountable>
    ),
  },
  {
    id: "cancel-subscription",
    title: "Cancel subscription",
    category: "Offers & billing",
    note: "Retention step — reason chips + 'stay and get credits' before portal.",
    render: () => (
      <TriggerMount>
        <CancelSubscriptionCard
          planName="Pro Annual"
          periodEnd={new Date(Date.now() + 86400000 * 90).toLocaleDateString()}
          loses={[
            "6000 monthly credits",
            "Priority generation queue",
            "Early access to new looks",
          ]}
          credits={500}
        />
      </TriggerMount>
    ),
  },
  {
    id: "trial-banner",
    title: "Trial banner",
    category: "Offers & billing",
    note: "Inline trial upsell (not an overlay — framed for inspection).",
    render: () => (
      <div className="mx-auto w-full max-w-lg">
        <TrialBanner
          headline="A little more room to create."
          description="Try Pro free for 7 days. Unlimited previews and 2,000 credits."
          priceCents={0}
          ctaLabel="Start free week"
          badge="NEW"
          onCta={noop}
        />
      </div>
    ),
  },
  {
    id: "referral-card",
    title: "Referral card",
    category: "Offers & billing",
    note: "Invite link + reward copy — embedded in the referral offer step.",
    render: () => (
      <div className="mx-auto w-full max-w-sm">
        <ReferralCard
          referralUrl="https://5pixels.app/r/PV1234"
          referralCode="PV1234"
          refereeReward="100 free credits"
          referrerReward="You earn 100 credits per signup"
          pendingCount={2}
        />
      </div>
    ),
  },
  {
    id: "blurred-stage",
    title: "Teaser — blurred result",
    category: "Offers & billing",
    note: "Anonymous teaser — blurred output over a signup gate.",
    render: () => (
      <div className="mx-auto w-full max-w-sm">
        <BlurredResultStage
          imageUrl={THUMB}
          alt="Preview result"
          variant={deriveTeaserVariant("preview")}
        >
          <div className="text-center">
            <p className="text-cream-50 text-sm font-semibold">
              Sign up to reveal your result
            </p>
            <Button variant="brand" size="sm" className="mt-3">
              Continue
            </Button>
          </div>
        </BlurredResultStage>
      </div>
    ),
  },

  // ------------------------------------------------------------ Consumer
  {
    id: "credit-confirm",
    title: "Credit spend confirm",
    category: "Consumer dialogs",
    note: "Pre-generation cost confirmation for costly presets.",
    render: () => (
      <Mountable>
        {(open, setOpen) => (
          <CreditConfirmDialog
            open={open}
            onOpenChange={setOpen}
            cost={3}
            balance={42}
            onConfirm={noop}
          />
        )}
      </Mountable>
    ),
  },
  {
    id: "auth-modal",
    title: "Auth modal",
    category: "Consumer dialogs",
    note: "Sign-in gate — split media bleed on desktop, sheet on mobile.",
    render: () => (
      <Mountable>
        {(open, setOpen) => (
          <AuthModal
            open={open}
            onOpenChange={setOpen}
            next="/app"
            preset={{
              name: "Cinematic Cat",
              thumbUrl: THUMB,
            }}
          />
        )}
      </Mountable>
    ),
  },
  {
    id: "share-dialog",
    title: "Share result",
    category: "Consumer dialogs",
    note: "Public link toggle + copy/native share. Dialog on desktop, sheet on mobile.",
    render: () => (
      <Mountable>
        {(open, setOpen) => (
          <ShareDialog
            open={open}
            onOpenChange={setOpen}
            generationId="pv-gen-1"
            initialShareId={null}
            presetName="Cinematic Cat"
            imageUrl={THUMB}
          />
        )}
      </Mountable>
    ),
  },
  {
    id: "edit-account",
    title: "Edit profile",
    category: "Consumer dialogs",
    note: "Avatar picker + display name — sticky header/footer.",
    render: () => (
      <Mountable>
        {(open, setOpen) => (
          <EditAccountDialog
            profile={{ display_name: "Preview User", avatar_asset_id: null }}
            avatarUrl={AVATAR}
            defaultAvatars={[
              { id: "av1", url: AVATAR, label: "Robot" },
              { id: "av2", url: "/avatars/avatar-02-fox.jpg", label: "Fox" },
              { id: "av3", url: "/avatars/avatar-04-pixel-art.jpg", label: "Pixel" },
            ]}
            open={open}
            onOpenChange={setOpen}
          />
        )}
      </Mountable>
    ),
  },
  {
    id: "notification-bell",
    title: "Notification inbox",
    category: "Consumer dialogs",
    note: "Bell popover on desktop, full sheet on mobile — click the bell.",
    render: () => (
      <TriggerMount>
        <div className="border-cream-100/10 bg-charcoal-850 flex items-center justify-end rounded-xl border px-4 py-2">
          <NotificationDropdown
            unreadCount={2}
            notifications={NOTIFICATIONS}
          />
        </div>
      </TriggerMount>
    ),
  },
  {
    id: "result-actions",
    title: "Result action console",
    category: "Consumer dialogs",
    note: "Download / share / save / regenerate rail — Share opens the share dialog.",
    render: () => (
      <TriggerMount>
        <ResultActions
          generationId="pv-gen-1"
          productSlug="cinematic-cat"
          productName="Cinematic Cat"
          creditCost={3}
          downloadUrl={THUMB}
          downloadUrls={[THUMB, THUMB_ALT]}
          initialShareId={null}
          initialSaved={false}
        />
      </TriggerMount>
    ),
  },
  {
    id: "library-card",
    title: "Library result card",
    category: "Consumer dialogs",
    note: "Card overflow menu → save/download/delete confirmations.",
    render: () => (
      <TriggerMount>
        <div className="w-56">
          <LibraryResultCard
            item={LIBRARY_ITEMS[0]!}
            onSaved={noop}
            onDownloaded={noop}
            onDeleted={noop}
          />
        </div>
      </TriggerMount>
    ),
  },
  {
    id: "delete-account",
    title: "Delete account flow",
    category: "Consumer dialogs",
    note: "Consequences page → T1 sheet with typed DELETE confirmation.",
    render: () => (
      <TriggerMount>
        <DeleteAccountFlow activePlan={ACTIVE_PLAN} creditBalance={240} />
      </TriggerMount>
    ),
  },
  {
    id: "onboarding",
    title: "Onboarding flow",
    category: "Consumer dialogs",
    note: "Full-screen stepped flow — welcome → username → goal → interests → source → done.",
    render: () => (
      <div className="border-cream-100/10 relative h-[70vh] w-full overflow-hidden rounded-2xl border">
        <OnboardingFlow
          email="preview@5pixels.app"
          interests={INTEREST_TILES}
          referredByName={null}
          next="/app"
        />
      </div>
    ),
  },
  {
    id: "search-palette",
    title: "Search palette",
    category: "Consumer dialogs",
    note: "⌘K command palette — presets, categories, library scope tabs.",
    render: () => (
      <Mountable>
        {(open, setOpen) => (
          <SearchPalette
            open={open}
            onOpenChange={setOpen}
            presets={SEARCH_PRESETS}
            categories={SEARCH_CATEGORIES}
            library={SEARCH_LIBRARY}
            isAuthenticated
          />
        )}
      </Mountable>
    ),
  },

  // -------------------------------------------------- Mobile & sheets
  {
    id: "create-sheet",
    title: "Create sheet",
    category: "Mobile & sheets",
    note: "Center-tab action sheet — recent presets + create entries.",
    render: () => (
      <Mountable>
        {(open, setOpen) => <CreateSheet open={open} onOpenChange={setOpen} />}
      </Mountable>
    ),
  },
  {
    id: "preset-quick-sheet",
    title: "Preset quick sheet",
    category: "Mobile & sheets",
    note: "Preset card tap on mobile — media, facts, CTA; nested image viewer.",
    render: () => <QuickSheetMount />,
  },
  {
    id: "library-filter",
    title: "Library filter",
    category: "Mobile & sheets",
    note: "Staged filters over owned results — computed count.",
    render: () => (
      <Mountable>
        {(open, setOpen) => (
          <LibraryFilterModal
            open={open}
            onOpenChange={setOpen}
            applied={DEFAULT_LIBRARY_FILTERS}
            items={LIBRARY_ITEMS}
            onApply={noop}
          />
        )}
      </Mountable>
    ),
  },
  {
    id: "catalog-filter",
    title: "Explore filter",
    category: "Mobile & sheets",
    note: "Full-screen T3 filter for the catalog — staged apply via navigation.",
    render: () => (
      <Mountable>
        {(open, setOpen) => (
          <FilterModal
            open={open}
            onOpenChange={setOpen}
            appliedSearch={null}
            appliedType={null}
            appliedCategory={null}
            appliedSort="featured"
            categories={CATEGORIES}
          />
        )}
      </Mountable>
    ),
  },
  {
    id: "family-selector",
    title: "Preset family rail",
    category: "Mobile & sheets",
    note: "Variant chips rail; over threshold a 'See all variations' sheet opens.",
    render: () => (
      <TriggerMount>
        <PresetFamilySelector
          members={FAMILY_MEMBERS}
          currentProductId="pv-family-0"
          onSelect={noop}
        />
      </TriggerMount>
    ),
  },
  {
    id: "image-viewer",
    title: "Image viewer",
    category: "Mobile & sheets",
    note: "Fullscreen pinch-zoom lightbox for results and examples.",
    render: () => (
      <Mountable>
        {(open, setOpen) => (
          <ImageViewer
            open={open}
            onOpenChange={setOpen}
            src={THUMB}
            alt="Cinematic Cat result"
            caption="Cinematic Cat · 3 credits"
          />
        )}
      </Mountable>
    ),
  },

  // -------------------------------------------------------------- Consent
  {
    id: "cookie-banner",
    title: "Cookie banner",
    category: "Consent",
    note: "First-visit consent bar — fixed bottom.",
    render: () => (
      <CookieBanner onAcceptAll={noop} onReject={noop} onCustomize={noop} />
    ),
  },
  {
    id: "cookie-settings",
    title: "Cookie settings",
    category: "Consent",
    note: "Per-category toggles from the footer link.",
    render: () => (
      <Mountable>
        {(open, setOpen) => (
          <CookieSettingsModal
            open={open}
            onOpenChange={setOpen}
            consent={CONSENT}
            onSave={noop}
          />
        )}
      </Mountable>
    ),
  },

  // ------------------------------------------------- Admin & editorial
  {
    id: "category-manager",
    title: "Category manager",
    category: "Admin & editorial",
    note: "Create/edit/toggle dialogs inside the manager — click Add category.",
    render: () => (
      <TriggerMount>
        <CategoryManager
          categories={[
            {
              id: "cat1",
              slug: "portraits",
              name: "Portraits",
              description: null,
              sort_order: 1,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]}
          onCreate={async () => ({
            id: "x",
            slug: "x",
            name: "x",
            description: null,
            sort_order: 0,
            is_active: true,
            created_at: "",
            updated_at: "",
          })}
          onUpdate={async () => ({
            id: "x",
            slug: "x",
            name: "x",
            description: null,
            sort_order: 0,
            is_active: true,
            created_at: "",
            updated_at: "",
          })}
          onToggleActive={async () => ({
            id: "x",
            slug: "x",
            name: "x",
            description: null,
            sort_order: 0,
            is_active: true,
            created_at: "",
            updated_at: "",
          })}
        />
      </TriggerMount>
    ),
  },
  {
    id: "version-rollback",
    title: "Version rollback",
    category: "Admin & editorial",
    note: "Preset version history → rollback confirm dialog.",
    render: () => (
      <TriggerMount>
        <VersionRollback
          productId="pv-product"
          activeVersionId="v2"
          versions={[
            { id: "v2", version_number: 2, state: "active", published_at: new Date().toISOString() },
            { id: "v1", version_number: 1, state: "superseded", published_at: null },
          ]}
          action={asyncSuccessNoop}
        />
      </TriggerMount>
    ),
  },
  {
    id: "product-actions",
    title: "Product status actions",
    category: "Admin & editorial",
    note: "Activate/pause transitions — confirm dialog with reason.",
    render: () => (
      <TriggerMount>
        <ProductActions
          productId="pv-product"
          status="scheduled"
          action={asyncSuccessNoop}
        />
      </TriggerMount>
    ),
  },
  {
    id: "article-row-actions",
    title: "Article row actions",
    category: "Admin & editorial",
    note: "Publish/unpublish/archive/duplicate confirms — fixture article.",
    render: () => (
      <TriggerMount>
        <ArticleRowActions article={STAFF_ARTICLE} />
      </TriggerMount>
    ),
  },
  {
    id: "preset-picker",
    title: "Article preset picker",
    category: "Admin & editorial",
    note: "Live catalog search dialog — read-only fetch, pick is inert.",
    render: () => (
      <Mountable>
        {(open, setOpen) => (
          <PresetPicker open={open} onOpenChange={setOpen} onPick={noop} />
        )}
      </Mountable>
    ),
  },
  {
    id: "generation-chooser",
    title: "Generation chooser",
    category: "Admin & editorial",
    note: "Embed-own-generation picker — empty with the fixture article.",
    render: () => (
      <Mountable>
        {(open, setOpen) => (
          <GenerationChooser
            open={open}
            onOpenChange={setOpen}
            articleId="pv-article-1"
            onPick={noop}
          />
        )}
      </Mountable>
    ),
  },
];

export const POPUP_CATEGORIES: PopupCategory[] = [
  "Offers & billing",
  "Consumer dialogs",
  "Mobile & sheets",
  "Consent",
  "Admin & editorial",
];
