/**
 * Admin version-selection helpers (#251). Pure functions — deliberately NOT
 * in a "use server" module so both the server component and tests can use
 * them (a "use server" file may only export async functions).
 */
export interface VersionRef {
  id: string;
  state: string;
  version_number: number;
}

/** The live (customer-facing) version, if one is published. */
export function selectLiveVersion(versions: VersionRef[]) {
  return versions.find((v) => v.state === "active") ?? null;
}

/**
 * Stale drafts: draft/testing versions numbered below the live version —
 * abandoned leftovers that must never masquerade as the current recipe,
 * be silently edited, or be published over the newer live version (#251).
 */
export function selectStaleVersions(versions: VersionRef[]) {
  const active = selectLiveVersion(versions);
  if (!active) return [];
  return versions.filter(
    (v) =>
      (v.state === "draft" || v.state === "testing") &&
      v.version_number < active.version_number
  );
}

/**
 * The conflict a stale draft creates at publish time, or null when the
 * target is publishable. Mirrored by the `publish_product_version` RPC so a
 * direct request hits the same block.
 */
export function stalePublishConflict(
  version: VersionRef,
  versions: VersionRef[]
): string | null {
  const active = selectLiveVersion(versions);
  if (!active || version.version_number >= active.version_number) return null;
  return `Cannot publish: v${version.version_number} is older than the live v${active.version_number} — discard or rebase the stale draft first.`;
}

/**
 * Select the version an admin should be editing. Versions are ordered by
 * number — not by state — because a draft is either ahead-of-live work or
 * abandoned leftovers: only the newest configuration is a sensible editing
 * target. A stale draft (v4 leftover while v5 is live) therefore never
 * silently becomes the editor's recipe (#251); it must be resolved through
 * the explicit discard/rebase workflow. Retired versions are only selectable
 * explicitly via rollback.
 */
export function selectEditableVersionSync(versions: VersionRef[]) {
  const stateRank = (state: string) =>
    ({ draft: 0, testing: 1, active: 2, retired: 3 })[state] ?? 4;
  const ordered = [...versions].sort((a, b) => {
    const numDiff = b.version_number - a.version_number;
    if (numDiff !== 0) return numDiff;
    return stateRank(a.state) - stateRank(b.state);
  });

  return (
    ordered.find(
      (v) =>
        v.state === "draft" || v.state === "testing" || v.state === "active"
    ) ??
    ordered[0] ??
    null
  );
}
