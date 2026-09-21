import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "./update-password-form";

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/forgot-password?error=link-expired");
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="You'll use it next time you log in."
    >
      <UpdatePasswordForm />
    </AuthShell>
  );
}
