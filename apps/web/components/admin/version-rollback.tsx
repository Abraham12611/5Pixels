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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichSelect } from "@/components/ui/rich-select";

interface RollbackTarget {
  id: string;
  version_number: number;
  state: string;
  published_at?: string | null;
}

interface VersionRollbackProps {
  productId: string;
  activeVersionId?: string;
  versions: RollbackTarget[];
  action: (
    productId: string,
    targetVersionId: string,
    reason?: string
  ) => Promise<void>;
}

export function VersionRollback({
  productId,
  activeVersionId,
  versions,
  action,
}: VersionRollbackProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<
    string | undefined
  >();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();

  const eligibleVersions = versions.filter(
    (v) =>
      v.id !== activeVersionId && v.state !== "draft" && v.state !== "active"
  );

  if (eligibleVersions.length === 0) return null;

  const selected = eligibleVersions.find((v) => v.id === selectedVersionId);

  const runRollback = () => {
    if (!selectedVersionId) return;
    setError(undefined);
    startTransition(async () => {
      try {
        await action(productId, selectedVersionId, reason.trim() || undefined);
        setConfirmOpen(false);
        setSelectedVersionId(undefined);
        setReason("");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Rollback failed. Please try again."
        );
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <RichSelect
          aria-label="Version to roll back to"
          className="w-64"
          value={selectedVersionId ?? ""}
          onValueChange={(v) => setSelectedVersionId(v || undefined)}
          noneLabel="Select prior version…"
          placeholder="Select prior version…"
          options={eligibleVersions.map((v) => ({
            value: v.id,
            label: `v${v.version_number}`,
            description: v.published_at
              ? new Date(v.published_at).toLocaleDateString()
              : undefined,
            badge: v.state,
          }))}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={!selectedVersionId || isPending}
          onClick={() => setConfirmOpen(true)}
        >
          Roll back
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-charcoal-850 text-cream-50 border-cream-100/10">
          <DialogHeader>
            <DialogTitle>
              Roll back to version {selected?.version_number}?
            </DialogTitle>
            <DialogDescription className="text-text-secondary">
              The current active version will be retired and the selected
              version will become active. This is logged.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="rollback-reason">Reason (optional)</Label>
            <Input
              id="rollback-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you rolling back?"
              disabled={isPending}
            />
          </div>

          {error && <p className="text-error text-sm">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={runRollback}
            >
              {isPending ? "Rolling back…" : "Confirm rollback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
