import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicProductBySlug } from "@/lib/db/explore";
import { createIntentSlug } from "@/lib/auth/intent";
import { isRelativePath } from "@/lib/auth/url";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "./signup-form";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
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

  let contextNote: string | null = null;
  const slug = createIntentSlug(next);
  if (slug) {
    const { data: product } = await getPublicProductBySlug(slug);
    contextNote = product
      ? `Create an account to try ${product.name}.`
      : "Create an account to try this look.";
  }

  const loginHref = `/login?next=${encodeURIComponent(next)}`;

  return (
    <AuthShell
      title="Create your 5Pixels account"
      subtitle="Save your results, keep your favorites, and create whenever inspiration hits."
      contextNote={contextNote}
      footer={
        <p className="text-text-secondary mt-6 text-center text-sm">
          Already have an account?{" "}
          <Link
            href={loginHref}
            className="font-medium text-lime-400 hover:underline"
          >
            Log in
          </Link>
        </p>
      }
    >
      <SignUpForm next={next} />
    </AuthShell>
  );
}
