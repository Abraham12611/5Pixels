import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/marketing/landing-page";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  return <LandingPage isAuthenticated={Boolean(userData.user)} />;
}
