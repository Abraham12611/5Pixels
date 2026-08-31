import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  if (user) {
    redirect("/app");
  }

  const params = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="border-cream-100/10 bg-charcoal-850 w-full max-w-sm rounded-2xl border p-8 shadow-lg">
        <h1 className="text-cream-50 text-2xl font-bold">Sign in</h1>
        <p className="text-text-secondary mt-1 text-sm">
          Welcome back to 5Pixels.
        </p>
        <LoginForm
          message={params.message}
          error={params.error}
          next={params.next}
        />
        <p className="text-text-secondary mt-6 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-lime-400 hover:underline"
          >
            Sign up
          </Link>
        </p>
        <p className="text-text-secondary mt-2 text-center text-sm">
          <Link
            href="/forgot-password"
            className="text-cream-100 hover:text-cream-50 font-medium"
          >
            Forgot your password?
          </Link>
        </p>
      </div>
    </main>
  );
}
