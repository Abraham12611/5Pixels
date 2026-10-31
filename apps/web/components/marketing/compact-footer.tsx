import Link from "next/link";

/**
 * Compact footer bar — used on preset-grid pages where the full landing
 * footer would overwhelm the browsing surface. Hidden on mobile by the
 * caller (the community pages mirror the reference's mobile-footer-less
 * treatment; signed-in users get the app bottom nav instead).
 */
export function CompactFooter({ className }: { className?: string }) {
  return (
    <footer
      className={`border-cream-100/10 bg-ink-950 border-t ${className ?? ""}`}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-6 sm:px-6 lg:px-10">
        <span className="text-text-muted text-xs">
          © {new Date().getFullYear()} 5Pixels — AI-native creative suite
        </span>
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
        >
          {[
            { label: "Presets", href: "/explore" },
            { label: "Pricing", href: "/pricing" },
            { label: "Articles", href: "/articles" },
            { label: "Terms", href: "/terms" },
            { label: "Privacy", href: "/privacy" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-text-secondary hover:text-cream-50 text-xs transition"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
