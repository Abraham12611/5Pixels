import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { LogoMark } from "@/components/logo-mark";
import { getPublicProductBySlug } from "@/lib/db/explore";
import { createClient } from "@/lib/supabase/server";
import { getUserCreditBalance } from "@/lib/generation/balance";
import { getSignedSourceUrlByAssetId } from "@/lib/generation/upload";
import { isMultiInputReleased } from "@/lib/generation/release-gates";
import { getPlansForPurchase } from "@/lib/db/plans";
import { creditPackOptions } from "@/lib/billing/credit-packs";
import { getBlockedCreditContext } from "@/lib/billing/segments";
import { getMyReferralCode } from "@/lib/referrals/rewards";
import { getCheapestGenerationCredits } from "@/lib/billing/credit-cost";
import { getOrAssignCampaignForUser } from "@/lib/offers/engine";
import { CreateGenerationForm } from "./create-form";
import type { OutputSizeOption } from "@/types/catalog";

export default async function CreatePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; inputs?: string }>;
}) {
  const { slug } = await params;
  const { from, inputs: inputsParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: product } = await getPublicProductBySlug(slug);
  if (!product) notFound();

  const [balance, generationCount, plans, cheapest, referralCode] =
    await Promise.all([
    user ? getUserCreditBalance() : Promise.resolve(0),
    user
      ? supabase
          .from("generations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .then((r) => r.count ?? 0)
      : Promise.resolve(0),
    getPlansForPurchase(),
    getCheapestGenerationCredits(),
    user ? getMyReferralCode() : Promise.resolve(null),
  ]);

  const generationPaused = process.env.GENERATION_PAUSED === "true";
  // Multi-image release gate (#178): the admin capability is a
  // precondition — while the provider pipeline (#193) isn't live, carried
  // sibling/adjust inputs aren't even resolved and the form renders the
  // one-photo experience.
  const multiReleased = isMultiInputReleased();

  // Blocked-credit routing (06 §2): who the user is decides which recovery
  // surface the Generate gate opens — subscriber top-up, weekly repurchase,
  // reactivation, contextual paywall, or the campaign offer ladder.
  const blocked = user
    ? await getBlockedCreditContext(user.id, generationCount)
    : null;
  const offer =
    blocked &&
    !blocked.offersOptedOut &&
    (blocked.segment === "new_user" || blocked.segment === "free_history")
      ? await getOrAssignCampaignForUser(user!.id)
      : null;
  const creditPacks = creditPackOptions(plans);
  const topUp =
    creditPacks.length > 0
      ? {
          packs: creditPacks,
          // Cheapest currently-quotable generation; null omits the
          // "≈ N transformations" claim rather than inventing a price.
          creditsPerTransformation: cheapest,
        }
      : null;

  // Adjust flow (?from=<generationId>): restore the source photo and the
  // options used for that run. Everything is re-validated at submit time —
  // this only prefills what the user already owned.
  let initialSource: { assetId: string; url: string; name: string } | null =
    null;
  let initialOptions: Record<string, unknown> | null = null;
  let initialSize: OutputSizeOption | null = null;
  /** Additional staged inputs handed across a sibling-variant switch
   *  (?inputs=a1,a2) or restored from a multi-input Adjust. The signed-url
   *  lookup enforces ownership — foreign ids are skipped, never shown. */
  const initialInputs: { assetId: string; url: string; name: string }[] = [];

  if (from && user) {
    const { data: previous } = await supabase
      .from("generations")
      .select("product_id, source_asset_id, requested_options, progress")
      .eq("id", from)
      .eq("user_id", user.id)
      .single();

    if (previous && previous.product_id === product.id) {
      if (previous.source_asset_id) {
        const url = await getSignedSourceUrlByAssetId(
          previous.source_asset_id
        );
        if (url) {
          initialSource = {
            assetId: previous.source_asset_id,
            url,
            name: "Your previous photo",
          };
        }
      }
      // Multi-input presets (#178): Adjust re-stages the full ordered input
      // set, not just the ordinal-1 projection. Rows are immutable and
      // owner-scoped, so this can only ever return the caller's own assets.
      const { data: inputRows } = multiReleased
        ? await supabase
            .from("generation_input_assets")
            .select("asset_id, ordinal")
            .eq("generation_id", from)
            .order("ordinal", { ascending: true })
        : { data: null };
      if (inputRows && inputRows.length > 1) {
        for (const row of inputRows) {
          if (row.asset_id === previous.source_asset_id) continue;
          try {
            const url = await getSignedSourceUrlByAssetId(
              row.asset_id as string
            );
            if (url) {
              initialInputs.push({
                assetId: row.asset_id as string,
                url,
                name: "Your previous photo",
              });
            }
          } catch {
            // Unresolvable input — skip rather than fail the whole restore.
          }
        }
      }
      if (
        previous.requested_options &&
        typeof previous.requested_options === "object"
      ) {
        initialOptions = previous.requested_options as Record<string, unknown>;
      }
      const progress = previous.progress as Record<string, unknown> | null;
      const prevW = Number(progress?.output_width);
      const prevH = Number(progress?.output_height);
      if (prevW > 0 && prevH > 0) {
        initialSize =
          product.output_sizes?.find(
            (s) => s.width === prevW && s.height === prevH
          ) ?? null;
      }
    }
  }

  // Sibling-variant carry (?inputs=a1,a2): a family switch hands already-
  // uploaded input assets forward; roles resolve positionally in the form
  // against the target version's declared capability (#178/#180).
  if (!from && inputsParam && user && multiReleased) {
    const ids = inputsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const id of ids) {
      try {
        const url = await getSignedSourceUrlByAssetId(id);
        if (url) {
          initialInputs.push({ assetId: id, url, name: "Kept photo" });
        }
      } catch {
        // Unresolvable/foreign asset — skip rather than fail the page.
      }
    }
  }

  return (
    <main className="flex flex-1 flex-col lg:max-h-[calc(100dvh-3.5rem)]">
      {!user && (
        <header className="border-cream-100/10 flex items-center justify-between border-b px-4 py-3">
          <Link
            href="/explore"
            className="text-text-secondary hover:text-cream-50 flex items-center gap-1.5 text-sm transition-colors"
          >
            <CaretLeft size={15} weight="bold" />
            Explore
          </Link>
          <LogoMark className="h-6 w-6" />
          <Link
            href={`/login?next=${encodeURIComponent(`/app/create/${slug}`)}`}
            className="text-lime-400 text-sm font-semibold"
          >
            Sign in
          </Link>
        </header>
      )}
      <CreateGenerationForm
        userId={user?.id ?? null}
        referralCode={referralCode ?? undefined}
        product={product}
        initialBalance={balance}
        hasPriorGenerations={generationCount > 0}
        generationPaused={generationPaused}
        initialSource={initialSource}
        initialInputs={initialInputs}
        multiInputReleased={multiReleased}
        initialOptions={initialOptions}
        initialSize={initialSize}
        plans={plans}
        blocked={blocked}
        offer={offer}
        topUp={topUp}
      />
    </main>
  );
}
