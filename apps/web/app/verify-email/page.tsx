import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isRelativePath } from "@/lib/auth/url";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailForm } from "./verify-email-form";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next =
    params.next && isRelativePath(params.next) ? params.next : "/app";
  const linkExpired = params.error === "link-expired";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-in visitor → the link already did its job.
  if (user) {
    return (
      <AuthShell
        title="Email verified"
        subtitle="You're ready to create."
      >
        <Button asChild variant="brand" className="mt-6 w-full">
          <Link href={next}>Continue to 5Pixels</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={
        linkExpired
          ? "This verification link isn't valid anymore"
          : "Verify your email"
      }
      subtitle={
        linkExpired
          ? "Verification links expire quickly and can only be used once."
          : params.email
            ? `We sent a verification link to ${params.email}.`
            : "We sent a verification link to your email."
      }
    >
      <VerifyEmailForm
        email={params.email}
        next={next}
        linkExpired={linkExpired}
      />
      {!linkExpired && (
        <p className="text-text-muted mt-4 text-center text-xs">
          You can keep this page open while you check your inbox.
        </p>
      )}
    </AuthShell>
  );
}
