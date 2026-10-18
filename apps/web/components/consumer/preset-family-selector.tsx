"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CaretLeft, CaretRight, Warning } from "@phosphor-icons/react";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { FamilyRailMember } from "@/lib/catalog/family";

export interface PresetFamilySelectorProps {
  /** Ordered root-then-siblings from `getPresetFamilyRail`. */
  members: FamilyRailMember[];
  currentProductId: string;
  /**
   * In-place selection — the create form's mode, where switching preserves
   * the draft. When omitted, members render as links via `hrefFor`
   * (default `/presets/{slug}`), preserving permalinks and browser Back.
   */
  onSelect?: (member: FamilyRailMember) => void;
  hrefFor?: (member: FamilyRailMember) => string;
  /**
   * Host-provided draft-compat notice for a member, e.g. from
   * `assessVariantSwitch().notices`. Rendered inside the chip so a member
   * that can't carry an input or role explains itself before selection —
   * the draft itself is never touched here.
   */
  noticeFor?: (member: FamilyRailMember) => string | null;
  title?: string;
  /** Beyond this count, a "See all variations" sheet is offered. */
  sheetThreshold?: number;
}

/**
 * Compact "Styles in this set" rail (#180): the family root and its direct
 * variants as horizontally scrollable, keyboard-navigable chips.
 *
 * Purely presentational — selection either navigates (link mode, canonical
 * permalink + browser Back) or calls `onSelect` for the host to apply
 * in-place with its own draft-preservation rules. Never triggers a
 * generation, a spend, or a draft change by itself.
 */
export function PresetFamilySelector({
  members,
  currentProductId,
  onSelect,
  hrefFor,
  noticeFor,
  title = "Styles in this set",
  sheetThreshold = 8,
}: PresetFamilySelectorProps) {
  const router = useRouter();
  const railRef = useRef<HTMLDivElement | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(() =>
    Math.max(
      0,
      members.findIndex((m) => m.productId === currentProductId)
    )
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  const linkHref = useCallback(
    (member: FamilyRailMember) => hrefFor?.(member) ?? `/presets/${member.slug}`,
    [hrefFor]
  );
  const select = useCallback(
    (member: FamilyRailMember) => {
      if (!member.available) return;
      if (onSelect) {
        onSelect(member);
      } else {
        router.push(linkHref(member));
      }
      setSheetOpen(false);
    },
    [onSelect, router, linkHref]
  );

  // Bring the current chip into view without scrolling the page.
  useEffect(() => {
    const rail = railRef.current;
    const option = rail?.querySelector<HTMLElement>(
      `[data-family-index="${focusedIndex}"]`
    );
    if (rail && option && typeof rail.scrollTo === "function") {
      rail.scrollTo({
        left: option.offsetLeft - rail.clientWidth / 2 + option.clientWidth / 2,
        behavior: "auto",
      });
    }
  }, [focusedIndex]);

  if (members.length <= 1) return null;

  const currentIndex = members.findIndex(
    (m) => m.productId === currentProductId
  );
  const focusIndex = (index: number) => {
    const next = (index + members.length) % members.length;
    setFocusedIndex(next);
    railRef.current
      ?.querySelector<HTMLElement>(`[data-family-index="${next}"]`)
      ?.focus();
  };
  const onRailKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusIndex(focusedIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusIndex(focusedIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusIndex(members.length - 1);
    }
  };

  const position = currentIndex >= 0 ? currentIndex + 1 : null;

  return (
    <section aria-label={title}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-text-muted text-[11px] font-semibold tracking-wider uppercase">
          {title}
          {position !== null && (
            <span className="text-text-secondary ml-2 font-normal normal-case tabular-nums">
              {position} of {members.length}
            </span>
          )}
        </p>
        <div className="flex items-center gap-1">
          {members.length > sheetThreshold && (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="text-[12px] font-medium text-lime-300 transition-colors hover:text-lime-200"
            >
              See all
            </button>
          )}
          <button
            type="button"
            aria-label="Previous variation"
            onClick={() => focusIndex(focusedIndex - 1)}
            className="text-text-secondary hover:text-cream-50 focus-visible:ring-lime-500/70 rounded-full p-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <button
            type="button"
            aria-label="Next variation"
            onClick={() => focusIndex(focusedIndex + 1)}
            className="text-text-secondary hover:text-cream-50 focus-visible:ring-lime-500/70 rounded-full p-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        role="listbox"
        aria-label={title}
        aria-orientation="horizontal"
        onKeyDown={onRailKeyDown}
        className="scrollbar-none -mx-1 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1"
      >
        {members.map((member, index) => (
          <FamilyChip
            key={member.productId}
            member={member}
            index={index}
            tabbable={index === focusedIndex}
            notice={member.isCurrent ? null : (noticeFor?.(member) ?? null)}
            setsize={members.length}
            onFocus={() => setFocusedIndex(index)}
            onSelect={() => select(member)}
            href={onSelect ? undefined : linkHref(member)}
          />
        ))}
      </div>

      {sheetOpen && (
        <Sheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          tier="content"
          ariaLabel="All variations"
          title="All variations"
        >
          <ul className="space-y-1 px-2 pb-4">
            {members.map((member) => {
              const notice = member.isCurrent
                ? null
                : (noticeFor?.(member) ?? null);
              const content = (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- public Storage thumb */}
                  <img
                    src={member.previewUrl ?? ""}
                    alt=""
                    aria-hidden={!member.previewUrl}
                    className="bg-charcoal-800 h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-cream-50 block truncate text-sm font-medium">
                      {member.label}
                    </span>
                    {notice ? (
                      <span className="mt-0.5 block text-[11px] text-amber-300">
                        {notice}
                      </span>
                    ) : null}
                  </span>
                  {member.isCurrent && (
                    <span className="text-text-muted text-[11px]">
                      Current
                    </span>
                  )}
                </>
              );
              return (
                <li key={member.productId}>
                  {onSelect ? (
                    <button
                      type="button"
                      disabled={!member.available}
                      onClick={() => select(member)}
                      className="hover:bg-charcoal-800 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors disabled:opacity-50"
                    >
                      {content}
                    </button>
                  ) : (
                    <Link
                      href={linkHref(member)}
                      onClick={() => setSheetOpen(false)}
                      aria-disabled={!member.available}
                      className={cn(
                        "hover:bg-charcoal-800 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors",
                        !member.available && "pointer-events-none opacity-50"
                      )}
                    >
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </Sheet>
      )}
    </section>
  );
}

function FamilyChip({
  member,
  index,
  setsize,
  tabbable,
  notice,
  href,
  onFocus,
  onSelect,
}: {
  member: FamilyRailMember;
  index: number;
  setsize: number;
  tabbable: boolean;
  notice: string | null;
  href?: string;
  onFocus: () => void;
  onSelect: () => void;
}) {
  const inner = (
    <>
      <span
        className={cn(
          "bg-charcoal-800 relative block h-14 w-14 shrink-0 overflow-hidden rounded-xl transition-shadow",
          member.isCurrent &&
            "ring-lime-400 ring-2 ring-offset-2 ring-offset-transparent"
        )}
      >
        {member.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- public Storage thumb, instant paint
          <img
            src={member.previewUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : null}
      </span>
      <span className="text-cream-50 mt-1.5 block max-w-14 truncate text-center text-[11px] leading-tight font-medium">
        {member.label}
      </span>
      {notice ? (
        <span className="mt-0.5 flex max-w-16 items-start justify-center gap-0.5 text-center text-[10px] leading-tight text-amber-300">
          <Warning size={10} weight="fill" className="mt-px shrink-0" />
          {notice}
        </span>
      ) : null}
      {!member.available ? (
        <span className="text-text-muted mt-0.5 block text-[10px]">
          Unavailable
        </span>
      ) : null}
    </>
  );

  const a11y = {
    role: "option" as const,
    "aria-selected": member.isCurrent,
    "aria-label": notice
      ? `${member.label} — ${notice}`
      : member.label,
    "aria-posinset": index + 1,
    "aria-setsize": setsize,
    tabIndex: tabbable ? 0 : -1,
    "data-family-index": index,
    onFocus,
  };

  const className = cn(
    "focus-visible:ring-lime-500/70 flex w-16 shrink-0 snap-start flex-col items-center rounded-xl py-1 focus-visible:ring-2 focus-visible:outline-none",
    !member.available && "cursor-not-allowed opacity-50"
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-disabled={!member.available}
        className={cn(className, !member.available && "pointer-events-none")}
        {...a11y}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled={!member.available}
      onClick={onSelect}
      className={className}
      {...a11y}
    >
      {inner}
    </button>
  );
}
