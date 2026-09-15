import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicProductBySlug } from "@/lib/db/explore";
import { createIntentSlug, intentLabel } from "@/lib/auth/intent";
import { isRelativePath } from "@/lib/auth/url";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string; next?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;
  const next =
    params.next && isRelativePath(params.next) ? params.next : "/app";

  if (user) {
    redirect(next);
  }

  // Surface a calm return-intent note: preset name for create flows,
  // destination name otherwise.
  let contextNote: string | null = null;
  const slug = createIntentSlug(next);
  if (slug) {
    const { data: product } = await getPublicProductBySlug(slug);
    contextNote = product
      ? `You'll return to ${product.name} after signing in.`
      : "You'll return to your look after signing in.";
  } else {
    const label = intentLabel(next);
    if (label && next !== "/app") {
      contextNote = `You'll return to ${label} after signing in.`;
    }
  }

  const signupHref = `/signup?next=${encodeURIComponent(next)}`;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to keep creating."
      contextNote={contextNote}
      footer={
        <p className="text-text-secondary mt-6 text-center text-sm">
          New to 5Pixels?{" "}
          <Link
            href={signupHref}
            className="font-medium text-lime-400 hover:underline"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <LoginForm
        message={params.message}
        error={params.error}
        next={next}
      />
    </AuthShell>
  );
}
