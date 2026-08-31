import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignUpForm } from "./signup-form";

export default async function SignUpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="border-cream-100/10 bg-charcoal-850 w-full max-w-sm rounded-2xl border p-8 shadow-lg">
        <h1 className="text-cream-50 text-2xl font-bold">Create account</h1>
        <p className="text-text-secondary mt-1 text-sm">
          Start transforming your photos with 5Pixels.
        </p>
        <SignUpForm />
        <p className="text-text-secondary mt-6 text-center text-sm">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-lime-400 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
