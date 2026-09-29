import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { AuthShell } from "@/components/auth/auth-shell";
import { ReferralCapture } from "@/components/auth/referral-capture";
import {
  ReferralClaimLink,
  ReferralWelcomeTracker,
} from "@/components/auth/referral-welcome";
import { UUID_RE } from "@/lib/referrals/session";
import { Check, Gift } from "@phosphor-icons/react/dist/ssr";

export const metadata = {
  title: "A gift for you — 5Pixels",
  robots: { index: false },
};

/**
 * Public referral landing (06 §3.7 — GrowPal "claim the gift" + Revolut
 * patterns). Referred visitors get a tailored welcome instead of being
 * dumped onto a bare signup form: who sent them, exactly what they get,
 * then one clear claim CTA. The attribution cookie drops on this page —
 * it survives even if they wander off and sign up later.
 */
export default async function ReferralWelcomePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  if (!UUID_RE.test(code)) redirect("/");

  const service = createServiceClient();
  const { data: referrer } = await service
    .from("profiles")
    .select("id, display_name, username")
    .eq("id", code)
    .maybeSingle();
  if (!referrer) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/app");

  const senderName =
    (referrer.display_name as string | null) ??
    (referrer.username as string | null) ??
    null;

  return (
    <AuthShell
      maxWidth="max-w-md"
      title={senderName ? `${senderName} sent you a gift` : "A friend sent you a gift"}
      subtitle="One free transformation — pick any Filter or Poster, upload a photo, and the result is on us."
      footer={
        <p className="text-text-muted mt-6 text-center text-[11px] leading-relaxed">
          For new accounts — one free transformation per referred signup.
          Credits from the referrer&rsquo;s side are handled separately;
          nothing is taken from them.
        </p>
      }
    >
      {/* Attribution cookie drops on landing — survives a browse-first path. */}
      <ReferralCapture referrerId={code} />
      <ReferralWelcomeTracker referrerId={code} />

      <div className="border-lime-500/30 bg-lime-500/[0.05] mt-5 flex items-start gap-3 rounded-[12px] border p-4">
        <span className="bg-lime-500/10 text-lime-400 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
          <Gift size={18} weight="fill" />
        </span>
        <div>
          <p className="text-cream-50 text-sm font-semibold">What you get</p>
          <ul className="text-text-secondary mt-1.5 space-y-1.5 text-[13px]">
            {[
              "Your first transformation free",
              "Every Filter and Poster open to try",
              "No card required to claim",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2">
                <Check
                  size={14}
                  weight="bold"
                  className="text-lime-400 mt-0.5 shrink-0"
                />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ReferralClaimLink referrerId={code} />
      <Link
        href="/explore"
        className="text-text-muted hover:text-cream-100 mt-3 block text-center text-xs transition-colors"
      >
        Browse the looks first
      </Link>
    </AuthShell>
  );
}
