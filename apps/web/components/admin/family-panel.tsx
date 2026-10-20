"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { PresetFamilyMember } from "@/lib/db/products";

interface FamilyPanelProps {
  /** The product whose page is being viewed. */
  currentProductId: string;
  type: "filter" | "poster";
  root: PresetFamilyMember;
  children_: PresetFamilyMember[];
  heroUrls?: Record<string, string>;
  reorder: (parentId: string, orderedChildIds: string[]) => Promise<void>;
  createVariant: (
    parentId: string
  ) => Promise<{ id: string }>;
  updateVariant: (
    productId: string,
    patch: {
      variantDisplayName?: string | null;
      standaloneDiscoverable?: boolean;
    }
  ) => Promise<void>;
}

const statusClass: Record<string, string> = {
  draft: "bg-charcoal-700 text-cream-100",
  active: "bg-lime-500/20 text-lime-400",
  published: "bg-lime-500/20 text-lime-400",
  paused: "bg-warning/20 text-warning",
  retired: "bg-error/20 text-error",
};

/**
 * Preset-family management panel (#177): sibling variants of a root preset
 * with order controls, standalone-discovery state, and an explicit
 * "new variant" copy-draft action. Children are family-dependent by
 * default — the panel makes the current visibility contract visible at a
 * glance.
 */
export function FamilyPanel({
  currentProductId,
  type,
  root,
  children_: children,
  heroUrls = {},
  reorder,
  createVariant,
  updateVariant,
}: FamilyPanelProps) {
  const memberHref = (id: string) => `/admin/${type}s/${id}`;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const move = (index: number, direction: -1 | 1) => {
    const next = [...children];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setError(undefined);
    startTransition(async () => {
      try {
        await reorder(
          root.id,
          next.map((m) => m.id)
        );
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Reorder failed.");
      }
    });
  };

  const addVariant = () => {
    setError(undefined);
    startTransition(async () => {
      try {
        const created = await createVariant(root.id);
        router.push(memberHref(created.id));
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create variant.");
      }
    });
  };

  const toggleStandalone = (member: PresetFamilyMember) => {
    setError(undefined);
    startTransition(async () => {
      try {
        await updateVariant(member.id, {
          standaloneDiscoverable: !member.standalone_discoverable,
        });
        router.refresh();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not update discovery."
        );
      }
    });
  };

  return (
    <section
      aria-label="Preset family"
      className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-cream-50 text-lg font-semibold">Preset family</h2>
        {currentProductId === root.id && (
          <button
            type="button"
            onClick={addVariant}
            disabled={pending}
            className="text-text-secondary hover:text-cream-50 rounded-md text-xs disabled:opacity-50"
          >
            + New variant (copy draft)
          </button>
        )}
      </div>
      <p className="text-text-muted mt-1.5 text-xs">
        Variants are shown inside the family on{" "}
        <Link
          href={memberHref(root.id)}
          className="text-cream-100 underline-offset-2 hover:underline"
        >
          {root.name}
        </Link>
        {root.id === currentProductId ? " (this preset)" : ""}. Each variant
        is a fully independent preset — nothing is shared with the parent at
        runtime.
      </p>

      {currentProductId === root.id && (
        <p className="text-text-muted mt-2 text-xs">
          New variant copies the newest editable draft first (then a testing
          version, then a published version), including custom-prompt settings
          and visual configuration. It may differ from the currently published
          recipe; review the copy before publishing.
        </p>
      )}

      {error && (
        <p role="alert" className="text-error mt-3 text-sm">
          {error}
        </p>
      )

      <ul className="mt-4 space-y-2">
        {children.length === 0 && (
          <li className="text-text-muted text-sm">
            No variants yet.
          </li>
        )}
        {children.map((member, index) => (
          <li
            key={member.id}
            className="border-cream-100/10 bg-charcoal-800 flex flex-wrap items-center gap-3 rounded-xl border p-3"
          >
            <span className="text-text-muted w-5 text-center text-xs">
              {index + 1}
            </span>
            {heroUrls[member.id ?? ""] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroUrls[member.id ?? ""]}
                alt=""
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <div className="bg-charcoal-700 h-10 w-10 rounded-lg" />
            )}
            <div className="min-w-0 flex-1">
              <Link
                href={memberHref(member.id)}
                className="text-cream-50 block truncate text-sm font-medium hover:underline"
              >
                {member.variant_display_name ?? member.name}
                {member.id === currentProductId && (
                  <span className="text-text-muted"> (editing)</span>
                )}
              </Link>
              <p className="text-text-muted text-xs">{member.slug}</p>
              <label className="text-text-secondary mt-1 flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={member.standalone_discoverable}
                  disabled={pending}
                  onChange={() => toggleStandalone(member)}
                  className="h-3.5 w-3.5 rounded text-lime-500"
                  aria-label={`Show ${member.variant_display_name ?? member.name} independently in Explore`}
                />
                {member.standalone_discoverable
                  ? "also in Explore"
                  : "family only"}
              </label>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[member.public_status] ?? "bg-charcoal-700 text-cream-100"}`}
            >
              {member.public_status}
            </span>
            <div className="flex flex-col">
              <button
                type="button"
                aria-label={`Move ${member.variant_display_name ?? member.name} up`}
                onClick={() => move(index, -1)}
                disabled={pending || index === 0}
                className="text-text-secondary hover:text-cream-50 disabled:opacity-30"
              >
                ▲
              </button>
              <button
                type="button"
                aria-label={`Move ${member.variant_display_name ?? member.name} down`}
                onClick={() => move(index, 1)}
                disabled={pending || index === children.length - 1}
                className="text-text-secondary hover:text-cream-50 disabled:opacity-30"
              >
                ▼
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
