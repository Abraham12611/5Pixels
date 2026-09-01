import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./app/sign-out-button";

const nav = [
  { href: "/app", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/app/favorites", label: "Favorites" },
  { href: "/app/generations", label: "History" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="bg-ink-950 flex min-h-screen flex-col">
      <header className="border-cream-100/10 bg-charcoal-850 border-b">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/app" className="text-lg font-bold text-lime-400">
            5Pixels
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-cream-100 hover:bg-charcoal-800 hover:text-cream-50 rounded-lg px-3 py-2 text-sm font-medium transition"
              >
                {item.label}
              </Link>
            ))}
            {user ? (
              <div className="ml-2">
                <SignOutButton />
              </div>
            ) : (
              <Link
                href="/login?next=/app"
                className="text-ink-950 ml-2 rounded-lg bg-lime-500 px-4 py-2 text-sm font-semibold transition hover:bg-lime-400"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
