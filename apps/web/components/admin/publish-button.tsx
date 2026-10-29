"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PROTECTED_GATE_CODES,
  type PublishGateFailure,
} from "@/lib/validation/publish-gates";
import {
  editorSectionForField,
  sectionLabel,
  ALL_EDITOR_SECTIONS,
} from "./editor-shell";

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
  /** True while the editor holds unsaved changes — publishing must not
   * silently exclude them, so the click is guarded with an explanation. */
  hasUnsavedChanges?: boolean;
  action: (
    productId: string,
    versionId: string,
    overrideReason?: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
}

export function PublishButton({
  productId,
  versionId,
  isOwner = false,
  gateFailures = [],
  hasUnsavedChanges = false,
  action,
}: PublishButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<PublishState>({ status: "idle" });
  const [overrideReason, setOverrideReason] = useState("");

  if (!versionId) return null;

  const hasFailures = gateFailures.length > 0;
  // Protected release gates are enforced unconditionally server-side — no
  // override reason can waive them, so the override control is not offered.
  const hasProtectedGate = gateFailures.some((f) =>
    PROTECTED_GATE_CODES.has(f.code)
  );
  const canOverride = isOwner && hasFailures && !hasProtectedGate;

  const failuresBySection = new Map<string, PublishGateFailure[]>();
  for (const failure of gateFailures) {
    const sectionId = editorSectionForField(failure.field);
    const group = failuresBySection.get(sectionId) ?? [];
    group.push(failure);
    failuresBySection.set(sectionId, group);
  }

  const runPublish = () => {
    if (hasUnsavedChanges) {
      setState({
        status: "error",
        message:
          "You have unsaved changes. Save first — publishing always uses the last saved version.",
      });
      return;
    }
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
        // Expected failures arrive as {ok:false,error} — thrown errors
        // would be digest-redacted in production and unreadable here.
        const result = await action(
          productId,
          versionId,
          canOverride ? trimmedReason : undefined
        );
        if (!result.ok) {
          setState({ status: "error", message: result.error });
          return;
        }
        setState({ status: "success" });
        setOverrideReason("");
        router.refresh();
      } catch {
        setState({
          status: "error",
          message: "Publish failed. Please try again.",
        });
      }
    });
  };

  return (
    <div className="flex flex-col items-stretch gap-3">
      {hasFailures && (
        <div className="border-error/30 bg-error/10 rounded-xl border p-4 text-sm">
          <p className="text-error font-semibold">
            {gateFailures.length}{" "}
            {gateFailures.length === 1
              ? "requirement blocks"
              : "requirements block"}{" "}
            publishing
          </p>
          <div className="mt-2 space-y-3">
            {Array.from(failuresBySection.entries()).map(
              ([sectionId, failures]) => (
                <div key={sectionId}>
                  <a
                    href={`#${sectionId}`}
                    className="text-lime-400 hover:text-lime-300 text-xs font-medium underline underline-offset-2"
                  >
                    {sectionLabel(ALL_EDITOR_SECTIONS, sectionId)} →
                  </a>
                  <ul className="text-cream-100 mt-1 list-disc space-y-1 pl-5">
                    {failures.map((f) => (
                      <li key={f.code + (f.field ?? "")}>{f.message}</li>
                    ))}
                  </ul>
                </div>
              )
            )}
          </div>
          {hasProtectedGate ? (
            <p className="text-text-secondary mt-3">
              Release gates cannot be overridden — they lift only when the
              protected server/database switches are enabled for this
              environment.
            </p>
          ) : (
            !isOwner && (
              <p className="text-text-secondary mt-3">
                Only the owner can override these failures.
              </p>
            )
          )}
        </div>
      )}

      {hasUnsavedChanges && (
        <p className="text-text-secondary text-xs">
          Save your changes before publishing — unsaved edits are never part of
          a published version.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {canOverride && (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Label htmlFor="override-reason" className="sr-only">
              Owner override reason
            </Label>
            <Input
              id="override-reason"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Owner override reason (min 12 chars)"
              disabled={isPending}
              className="w-full sm:w-72"
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
        <p role="alert" className="text-error text-sm">
          Publishing is blocked — resolve the requirements listed above.
        </p>
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
