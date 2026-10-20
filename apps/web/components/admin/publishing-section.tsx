"use client";

import { useFormContext, useFormState } from "react-hook-form";
import { PublishButton } from "./publish-button";
import { ProductActions } from "./product-actions";
import { VersionRollback } from "./version-rollback";
import { VersionList, type VersionSummary } from "./version-list";
import type { PublishGateFailure } from "@/lib/validation/publish-gates";

interface RollbackTarget {
  id: string;
  version_number: number;
  state: string;
  published_at?: string | null;
}

/**
 * "Publishing & history" workspace block (#222). Composes the version
 * lifecycle controls — publish readiness, rollback, status transitions and
 * history — and reads RHF context (it renders inside the editor's
 * FormProvider) to guard against publishing unsaved edits.
 */
interface PublishingSectionProps {
  productId: string;
  status:
    | "draft"
    | "internal_test"
    | "private_beta"
    | "scheduled"
    | "active"
    | "paused"
    | "retired";
  versionId?: string;
  isOwner: boolean;
  gateFailures: PublishGateFailure[];
  activeVersionId?: string;
  rollbackVersions: RollbackTarget[];
  versionSummaries: VersionSummary[];
  selectedVersionId?: string;
  publish: (
    productId: string,
    versionId: string,
    overrideReason?: string
  ) => Promise<void>;
  rollback: (
    productId: string,
    targetVersionId: string,
    reason?: string
  ) => Promise<void>;
  transitionStatus: (
    productId: string,
    newStatus: string,
    reason?: string
  ) => Promise<void>;
}

export function PublishingSection({
  productId,
  status,
  versionId,
  isOwner,
  gateFailures,
  activeVersionId,
  rollbackVersions,
  versionSummaries,
  selectedVersionId,
  publish,
  rollback,
  transitionStatus,
}: PublishingSectionProps) {
  const { control } = useFormContext();
  const { isDirty } = useFormState({ control });

  return (
    <section className="border-cream-100/10 bg-charcoal-850 space-y-6 rounded-2xl border p-4 sm:p-6">
      <div>
        <h2 className="text-cream-50 text-lg font-semibold">
          Publishing &amp; history
        </h2>
        <p className="text-text-muted mt-1.5 text-xs">
          Product status controls whether the preset is listed and who can see
          it. Publishing a version decides which saved version generates
          results — the two are independent: an active product keeps serving
          its active version until a different one is published.
        </p>
      </div>

      {isDirty && (
        <p
          role="status"
          className="border-warning/40 bg-warning/10 text-warning rounded-xl border px-4 py-3 text-sm"
        >
          You have unsaved changes. Publishing uses the last saved version —
          save first so the live version includes your edits.
        </p>
      )}

      <PublishButton
        productId={productId}
        versionId={versionId}
        isOwner={isOwner}
        gateFailures={gateFailures}
        hasUnsavedChanges={isDirty}
        action={publish}
      />

      {activeVersionId && (
        <div>
          <h3 className="text-cream-50 mb-2 text-sm font-semibold">
            Roll back
          </h3>
          <VersionRollback
            productId={productId}
            activeVersionId={activeVersionId}
            versions={rollbackVersions}
            action={rollback}
          />
        </div>
      )}

      <div>
        <h3 className="text-cream-50 mb-2 text-sm font-semibold">
          Catalog status
        </h3>
        <p className="text-text-muted mb-3 text-xs">
          Current status:{" "}
          <span className="bg-charcoal-700 text-cream-100 rounded-full px-2 py-0.5 text-xs font-medium">
            {status}
          </span>
        </p>
        <ProductActions
          productId={productId}
          status={status}
          action={transitionStatus}
        />
      </div>

      {versionSummaries.length > 0 && (
        <VersionList
          versions={versionSummaries}
          selectedVersionId={selectedVersionId}
        />
      )}
    </section>
  );
}
