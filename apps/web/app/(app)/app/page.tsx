import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

export default async function AppHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const email = user.email ?? "Authenticated user";

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="text-cream-50 text-4xl font-bold">App home</h1>
      <p className="text-text-secondary mt-4">
        Recent generations, favorites, and recommendations will appear here.
      </p>
      <p className="text-text-secondary mt-6 text-sm">
        Signed in as <span className="text-cream-50">{email}</span>
      </p>
      <SignOutButton />
    </main>
  );
}
