"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface StaleVersionRef {
  version_number: number;
  route: string;
}

interface StaleDraftBannerProps {
  productId: string;
  liveVersion: StaleVersionRef;
  staleVersions: StaleVersionRef[];
  /**
   * Explicit conflict resolution (#251): `recreate` rebases the work onto a
   * fresh draft cloned from live; `!recreate` only discards the stale drafts.
   */
  resolve: (
    productId: string,
    recreate: boolean
  ) => Promise<
    { ok: true; data: string | null } | { ok: false; error: string }
  >;
}

/**
 * Warning shown when draft/testing versions exist that are older than the
 * live version. They are leftovers — never the recipe customers use — and
 * cannot be edited or published until resolved (#251).
 */
export function StaleDraftBanner({
  productId,
  liveVersion,
  staleVersions,
  resolve,
}: StaleDraftBannerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<"rebase" | "discard" | null>(null);
  const [error, setError] = useState<string>();

  if (staleVersions.length === 0) return null;

  const staleList = staleVersions
    .map((v) => `v${v.version_number}`)
    .join(", ");

  const runResolve = () => {
    if (!confirm) return;
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await resolve(productId, confirm === "rebase");
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setConfirm(null);
        router.refresh();
      } catch {
        setError("Could not resolve stale drafts. Please try again.");
      }
    });
  };

  return (
    <div
      role="alert"
      className="border-warning/40 bg-warning/10 text-warning rounded-xl border px-4 py-3 text-sm"
    >
      <p className="font-semibold">
        {staleVersions.length === 1
          ? `Stale draft ${staleList} predates the live version`
          : `Stale drafts ${staleList} predate the live version`}
      </p>
      <p className="mt-1">
        {staleVersions
          .map((v) => `v${v.version_number} (${v.route})`)
          .join(", ")}{" "}
        {staleVersions.length === 1 ? "was" : "were"} created before the live
        v{liveVersion.version_number} ({liveVersion.route}) and cannot be
        edited or published — discard{" "}
        {staleVersions.length === 1 ? "it" : "them"}, or rebase onto a fresh
        draft cloned from live.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => setConfirm("rebase")}
        >
          Rebase from live v{liveVersion.version_number}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => setConfirm("discard")}
        >
          Discard only
        </Button>
      </div>

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent className="bg-charcoal-850 text-cream-50 border-cream-100/10">
          <DialogHeader>
            <DialogTitle>
              {confirm === "rebase"
                ? `Rebase ${staleList} from live v${liveVersion.version_number}?`
                : `Discard stale ${staleVersions.length === 1 ? "draft" : "drafts"} ${staleList}?`}
            </DialogTitle>
            <DialogDescription className="text-text-secondary">
              {confirm === "rebase"
                ? `The stale ${staleVersions.length === 1 ? "draft" : "drafts"} will be retired and a fresh draft cloned from live v${liveVersion.version_number} (${liveVersion.route}) becomes the editing target.`
                : `The stale ${staleVersions.length === 1 ? "draft" : "drafts"} will be retired — no new draft is created.`}{" "}
              The live version is never modified. This is logged.
            </DialogDescription>
          </DialogHeader>

          {error && <p className="text-error text-sm">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirm(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={runResolve}
            >
              {isPending
                ? "Resolving…"
                : confirm === "rebase"
                  ? "Confirm rebase"
                  : "Confirm discard"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
