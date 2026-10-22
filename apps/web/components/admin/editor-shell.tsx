"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Preset editor workspace scaffolding (#222, Engineer A).
 *
 * The Filter/Poster editor is one long React Hook Form document split into
 * anchored section groups. The nav is a scroll-spy chip rail — anchor links
 * scroll instead of switching tabs, so unsaved fields are never unmounted.
 */

export interface EditorSectionDef {
  id: string;
  label: string;
}

export const FORM_SECTIONS: EditorSectionDef[] = [
  { id: "overview", label: "Overview" },
  { id: "media", label: "Media & preview" },
  { id: "creative", label: "Creative settings" },
  { id: "ai-routing", label: "AI & routing" },
  { id: "inputs", label: "Inputs & controls" },
  { id: "advanced", label: "Advanced" },
];

export const REFERENCES_SECTION: EditorSectionDef = {
  id: "references",
  label: "References",
};

export const PUBLISHING_SECTION: EditorSectionDef = {
  id: "publishing",
  label: "Publishing & history",
};

/** Every section a blocker/error can map to, including edit-page extras. */
export const ALL_EDITOR_SECTIONS: EditorSectionDef[] = [
  ...FORM_SECTIONS,
  REFERENCES_SECTION,
  PUBLISHING_SECTION,
];

/**
 * Form field path → owning section. Shared by the validation error summary
 * and the publish-readiness blockers so both jump to the same place.
 * Order matters: the first matching rule wins.
 */
const FIELD_SECTION_RULES: Array<[RegExp, string]> = [
  [
    /^(parent_preset_id|standalone_discoverable|variant_display_name|variant_sort_order)$/,
    "overview",
  ],
  [
    /^(name|slug|type|category_id|public_status|visibility|short_description|long_description|public_prompt_recipe|credit_cost|featured_rank|likeness_level)$/,
    "overview",
  ],
  [
    /^(hero_asset_id|poster_asset_id|preview_video_asset_id|preview_gif_asset_id)$/,
    "media",
  ],
  [/^(filter_config|poster_config)(\.|$)/, "creative"],
  [/^version\.provider_strategy/, "ai-routing"],
  [/^version\.private_/, "ai-routing"],
  [/^version\.model_config/, "ai-routing"],
  [/^version\.input_capability(\.|$)/, "inputs"],
  [/^prompt_ui(\.|$)/, "inputs"],
  [/^fields(\.|$)/, "inputs"],
  [
    /^version\.(output_sizes|input_validation_config|post_process_config|safety_config|credit_cost)(\.|$)/,
    "advanced",
  ],
  [/^version\.(state|version_number|id)$/, "publishing"],
  [/^version\./, "advanced"],
];

export function editorSectionForField(path: string | undefined): string {
  if (!path) return "overview";
  for (const [rule, section] of FIELD_SECTION_RULES) {
    if (rule.test(path)) return section;
  }
  return "overview";
}

export function sectionLabel(
  sections: EditorSectionDef[],
  id: string
): string {
  return sections.find((s) => s.id === id)?.label ?? "General";
}

/** Smooth-scroll a section group into view below the sticky header + nav. */
export function scrollToSection(sectionId: string) {
  document
    .getElementById(sectionId)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const FOCUSABLE =
  'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * Scroll to the owning section and focus the invalid control. Registered
 * inputs are found by `name`, rich selects by the forwarded `id`; falls back
 * to the first focusable element inside the section.
 */
export function focusFieldInSection(path: string) {
  const sectionId = editorSectionForField(path);
  const section = document.getElementById(sectionId);
  const byName = section?.querySelector<HTMLElement>(
    `[name="${CSS.escape(path)}"]`
  );
  const target =
    document.getElementById(path) ??
    byName ??
    section?.querySelector<HTMLElement>(FOCUSABLE) ??
    section;
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  if (target instanceof HTMLElement) target.focus({ preventScroll: true });
}

/**
 * Anchor target for one nav group. Keeps each block's own <section> styling —
 * this wrapper only supplies the scroll anchor + margin under the sticky bars.
 */
export function EditorSectionGroup({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      id={id}
      data-editor-section={id}
      className={cn("space-y-8 scroll-mt-[7.5rem]", className)}
    >
      {children}
    </div>
  );
}

/**
 * Sticky scroll-spy navigation for the editor. Anchored chips — mouse, touch
 * and keyboard all work; nothing unmounts, so RHF state is preserved.
 */
export function EditorSectionNav({
  sections,
}: {
  sections: EditorSectionDef[];
}) {
  const [activeId, setActiveId] = useState<string | undefined>(
    sections[0]?.id
  );

  // Active group = the last one whose top edge is above the reading line
  // (just under the sticky nav). rAF-throttled scroll listener keeps it cheap.
  useEffect(() => {
    let raf = 0;
    const update = () => {
      const readingLine = 130;
      let current = sections[0]?.id;
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (el && el.getBoundingClientRect().top <= readingLine) {
          current = section.id;
        }
      }
      setActiveId((prev) => (prev === current ? prev : current));
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sections]);

  const jumpTo = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setActiveId(id);
    scrollToSection(id);
  };

  return (
    <nav
      aria-label="Editor sections"
      className="bg-ink-950/90 sticky top-[52px] z-30 -mx-1 backdrop-blur-md"
    >
      <ul className="scrollbar-none flex gap-1.5 overflow-x-auto px-1 py-2.5">
        {sections.map((section) => (
          <li key={section.id} className="shrink-0">
            <a
              href={`#${section.id}`}
              onClick={jumpTo(section.id)}
              aria-current={activeId === section.id ? "location" : undefined}
              className={cn(
                "block rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors",
                activeId === section.id
                  ? "border-lime-500/40 bg-lime-500/10 text-cream-50"
                  : "border-cream-100/10 bg-charcoal-850 text-text-secondary hover:text-cream-100"
              )}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
