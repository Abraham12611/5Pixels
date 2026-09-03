import { createClient } from "@/lib/supabase/server";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(userData.user);

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader isAuthenticated={isAuthenticated} />
      <div className="flex-1">{children}</div>
      <MarketingFooter isAuthenticated={isAuthenticated} />
    </div>
  );
}
