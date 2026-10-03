import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getActiveCategories, getPublicProducts } from "@/lib/db/explore";
import { publicAssetUrl } from "@/lib/catalog/media";
import {
  OnboardingFlow,
  type InterestTile,
} from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = {
  title: "Set up your studio — 5Pixels",
  robots: { index: false },
};

export const dynamic = "force-dynamic";


export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/onboarding${next ? `&then=${encodeURIComponent(next)}` : ""}`);
  }

  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("email, username, onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  // Existing users (backfilled) and anyone who finished the flow go
  // straight to the app — onboarding is never re-entered (08 §5).
  if (profile?.onboarding_completed_at) {
    redirect(next || "/app");
  }

  // If the referral was already attributed (e.g. /r/<code> → signup), the
  // code step shows the "already applied" state instead of the input.
  let referredByName: string | null = null;
  const { data: attribution } = await service
    .from("referral_participants")
    .select("referred_by")
    .eq("user_id", user.id)
    .not("referred_by", "is", null)
    .maybeSingle();
  if (attribution?.referred_by) {
    const { data: referrer } = await service
      .from("profiles")
      .select("username, display_name")
      .eq("id", attribution.referred_by)
      .maybeSingle();
    referredByName = referrer?.username ?? referrer?.display_name ?? "a friend";
  }

  // Interest tiles: one image per active category, resolved from the
  // featured catalog (Skillshare-style visual pickers beat text chips).
  const categories = await getActiveCategories();
  const { data: featured } = await getPublicProducts(
    undefined,
    undefined,
    undefined,
    undefined,
    "featured",
    1,
    60
  );
  const imageByCategory = new Map<string, string>();
  for (const p of featured) {
    if (!p.category_slug || imageByCategory.has(p.category_slug)) continue;
    const still =
      p.public_assets.find((a) => a.role === "hero") ??
      p.public_assets.find((a) => a.role === "poster") ??
      p.public_assets.find((a) => a.mime_type.startsWith("image/"));
    if (still) {
      imageByCategory.set(
        p.category_slug,
        publicAssetUrl(still.bucket, still.storage_key)
      );
    }
  }
  const tiles: InterestTile[] = categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    imageUrl: imageByCategory.get(c.slug) ?? null,
  }));

  return (
    <OnboardingFlow
      email={profile?.email ?? user.email ?? null}
      interests={tiles}
      referredByName={referredByName}
      next={next || "/app"}
    />
  );
}
