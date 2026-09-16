import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { AdminNav } from "@/components/admin/admin-nav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-ink-950 flex min-h-screen flex-col">
      <header className="border-cream-100/10 bg-ink-950/85 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link
            href="/admin"
            className="flex items-center gap-2.5"
            aria-label="5Pixels admin home"
          >
            <span
              aria-hidden="true"
              className="inline-flex items-center gap-[2.5px]"
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="bg-lime-400 h-2 w-[3px] rounded-[1px]"
                />
              ))}
            </span>
            <span className="text-cream-50 text-sm font-semibold">
              5Pixels Admin
            </span>
          </Link>
          <Link
            href="/app"
            className="text-text-secondary hover:text-cream-50 flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors"
          >
            Exit admin
            <ArrowSquareOut size={14} />
          </Link>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:gap-6 lg:py-8">
        <AdminNav />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
