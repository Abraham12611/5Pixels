import Link from "next/link";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/filters", label: "Filters" },
  { href: "/admin/posters", label: "Posters" },
  { href: "/admin/categories", label: "Categories" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-ink-950 flex min-h-screen flex-col">
      <header className="border-cream-100/10 bg-charcoal-850 border-b">
        <div className="flex items-center justify-between px-8 py-4">
          <Link href="/admin" className="text-lg font-bold text-lime-400">
            5Pixels Admin
          </Link>
          <nav className="flex gap-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-cream-100 hover:bg-charcoal-800 hover:text-cream-50 rounded-lg px-4 py-2 text-sm font-medium transition"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/app"
              className="text-text-secondary hover:text-cream-50 rounded-lg px-4 py-2 text-sm font-medium transition"
            >
              Exit admin
            </Link>
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
