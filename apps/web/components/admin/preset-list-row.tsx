import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DuplicateButton } from "@/components/admin/duplicate-button";
import { ProductActions } from "@/components/admin/product-actions";

type ProductStatus =
  | "draft"
  | "internal_test"
  | "private_beta"
  | "scheduled"
  | "active"
  | "paused"
  | "retired";

interface PresetListRowProps {
  name: string;
  slug: string;
  status: ProductStatus;
  productId: string;
  editHref: string;
  listHref: string;
  statusAction: (
    productId: string,
    newStatus: string,
    reason?: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  duplicateAction: (id: string) => Promise<unknown>;
}

/**
 * Shared preset list row for /admin/filters and /admin/posters (#228).
 * `flex-wrap` on both the row and the action cluster keeps Retire,
 * Duplicate and Edit reachable without page-level horizontal scroll at
 * phone widths — the action group wraps onto its own line instead of
 * pushing off-screen. `min-w-0` + `wrap-anywhere` let long names and slugs
 * shrink rather than force the cluster out.
 */
export function PresetListRow({
  name,
  slug,
  status,
  productId,
  editHref,
  listHref,
  statusAction,
  duplicateAction,
}: PresetListRowProps) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 p-4">
      <div className="min-w-0">
        <p className="text-cream-50 wrap-anywhere font-semibold">{name}</p>
        <p className="text-text-muted wrap-anywhere text-sm">{slug}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <span className="bg-charcoal-700 text-cream-100 rounded-full px-3 py-1 text-xs">
          {status}
        </span>
        <ProductActions
          productId={productId}
          status={status}
          action={statusAction}
        />
        <DuplicateButton
          productId={productId}
          action={duplicateAction}
          listHref={listHref}
        />
        <Button asChild variant="secondary">
          <Link href={editHref}>Edit</Link>
        </Button>
      </div>
    </li>
  );
}
