"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PublishGateFailure } from "@/lib/validation/publish-gates";

export type PublishState =
  | { status: "idle" }
  | { status: "checking"; failures: PublishGateFailure[] }
  | { status: "blocked"; failures: PublishGateFailure[] }
  | { status: "success" }
  | { status: "error"; message: string };

interface PublishButtonProps {
  productId: string;
  versionId?: string;
  isOwner?: boolean;
  gateFailures?: PublishGateFailure[];
  action: (
    productId: string,
    versionId: string,
    overrideReason?: string
  ) => Promise<void>;
}

export function PublishButton({
  productId,
  versionId,
  isOwner = false,
  gateFailures = [],
  action,
}: PublishButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<PublishState>({ status: "idle" });
  const [overrideReason, setOverrideReason] = useState("");

  if (!versionId) return null;

  const hasFailures = gateFailures.length > 0;
  const canOverride = isOwner && hasFailures;

  const runPublish = () => {
    if (hasFailures && !canOverride) {
      setState({ status: "blocked", failures: gateFailures });
      return;
    }

    const trimmedReason = overrideReason.trim();
    if (hasFailures && canOverride && trimmedReason.length < 12) {
      setState({
        status: "error",
        message: "Override reason must be at least 12 characters.",
      });
      return;
    }

    setState({ status: "checking", failures: gateFailures });
    startTransition(async () => {
      try {
        await action(
          productId,
          versionId,
          canOverride ? trimmedReason : undefined
        );
        setState({ status: "success" });
        setOverrideReason("");
        router.refresh();
      } catch (err) {
        setState({
          status: "error",
          message:
            err instanceof Error
              ? err.message
              : "Publish failed. Please try again.",
        });
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-3">
      <div className="flex items-center gap-3">
        {canOverride && (
          <div className="flex items-center gap-2">
            <Label htmlFor="override-reason" className="sr-only">
              Owner override reason
            </Label>
            <Input
              id="override-reason"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Owner override reason (min 12 chars)"
              disabled={isPending}
              className="w-72"
            />
          </div>
        )}
        <Button
          type="button"
          disabled={isPending || (hasFailures && !canOverride)}
          onClick={runPublish}
        >
          {isPending
            ? "Publishing…"
            : canOverride
              ? "Publish with override"
              : "Publish version"}
        </Button>
      </div>

      {state.status === "blocked" && (
        <div className="border-error/30 bg-error/10 max-w-md rounded-xl border p-4 text-sm">
          <p className="text-error font-semibold">Cannot publish</p>
          <ul className="text-cream-100 mt-2 list-disc space-y-1 pl-5">
            {state.failures.map((f) => (
              <li key={f.code + f.field}>{f.message}</li>
            ))}
          </ul>
          {!isOwner && (
            <p className="text-text-secondary mt-2">
              Only the owner can override these failures.
            </p>
          )}
        </div>
      )}

      {state.status === "error" && (
        <p role="alert" className="text-error max-w-md text-sm">
          {state.message}
        </p>
      )}

      {state.status === "success" && (
        <p role="status" className="text-sm text-lime-400">
          Version published successfully.
        </p>
      )}
    </div>
  );
}
