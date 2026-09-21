import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  const { error } = await searchParams;
  const linkExpired = error === "link-expired";

  return (
    <AuthShell
      title={linkExpired ? "This reset link has expired" : "Reset your password"}
      subtitle={
        linkExpired
          ? "Reset links can only be used once and expire quickly."
          : "Enter the email you use for 5Pixels and we'll send a reset link."
      }
    >
      <ForgotPasswordForm linkExpired={linkExpired} />
    </AuthShell>
  );
}
