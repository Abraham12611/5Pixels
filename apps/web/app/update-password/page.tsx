import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UpdatePasswordForm } from "./update-password-form";

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/forgot-password");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="border-cream-100/10 bg-charcoal-850 w-full max-w-sm rounded-2xl border p-8 shadow-lg">
        <h1 className="text-cream-50 text-2xl font-bold">Update password</h1>
        <p className="text-text-secondary mt-1 text-sm">
          Choose a new password for your account.
        </p>
        <UpdatePasswordForm />
      </div>
    </main>
  );
}
