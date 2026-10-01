import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/constants";

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  intro: React.ReactNode;
  sections: LegalSection[];
}

const RELATED_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Acceptable Use Policy", href: "/acceptable-use" },
  { label: "Cookie Notice", href: "/cookies" },
];

export function LegalPage({
  title,
  lastUpdated,
  intro,
  sections,
}: LegalPageProps) {
  return (
    <main className="flex flex-1 flex-col px-4 py-12 sm:px-6 lg:py-20">
      <div className="mx-auto w-full max-w-3xl">
        <p className="text-lime-400 text-xs font-semibold uppercase tracking-[0.18em]">
          Legal
        </p>
        <h1 className="font-display text-cream-50 mt-3 text-4xl leading-tight tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="text-text-muted mt-3 text-sm">Last updated: {lastUpdated}</p>
        <div className="text-text-secondary mt-6 text-base leading-relaxed">
          {intro}
        </div>

        {/* Table of contents */}
        <nav
          aria-label="On this page"
          className="border-cream-100/10 bg-charcoal-850 mt-10 rounded-2xl border p-5"
        >
          <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wider">
            On this page
          </p>
          <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-text-secondary hover:text-lime-400 text-sm transition-colors"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-12 space-y-10">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="text-cream-50 text-xl font-semibold sm:text-2xl">
                {section.title}
              </h2>
              <div className="text-text-secondary mt-4 space-y-4 text-[15px] leading-relaxed [&_a]:text-lime-400 [&_a]:underline [&_a]:underline-offset-4 [&_a]:transition-colors hover:[&_a]:text-lime-300 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_li_strong]:text-cream-100 [&_ul]:space-y-2">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        <div className="border-cream-100/10 mt-14 flex flex-col gap-3 border-t pt-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-text-secondary">
            Questions?{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-lime-400 font-medium hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {RELATED_LINKS.filter((l) => l.label !== title).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-text-secondary hover:text-cream-50 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
