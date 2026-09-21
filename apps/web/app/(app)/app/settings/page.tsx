import { redirect } from "next/navigation";

const SECTION_ROUTES: Record<string, string> = {
  profile: "/app/account/profile",
  security: "/app/account/security",
  preferences: "/app/account/privacy",
  delete: "/app/account/delete",
  subscription: "/app/billing/plan",
  credits: "/app/billing/credits",
  usage: "/app/billing/credits",
  promo: "/app/billing",
};

export default async function SettingsRedirect(props: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section } = await props.searchParams;
  redirect(
    section && SECTION_ROUTES[section] ? SECTION_ROUTES[section] : "/app/account"
  );
}
