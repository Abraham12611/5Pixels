import { isRelativePath } from "@/lib/auth/url";

// Auth surfaces and intermediate auth screens must never be used as a
// `next` target — pointing a login/signup link back at one would loop or
// dead-end the visitor on a page that expects credentials.
const NON_RETURN_PREFIXES = [
  "/login",
  "/signup",
  "/verify-email",
  "/forgot-password",
  "/update-password",
  "/onboarding",
  "/auth",
  "/logout",
];

/**
 * Builds an auth-entry href that returns the visitor to where they were.
 * Returns the bare `base` — letting the auth page apply its own "/app"
 * default — when the current location isn't a meaningful return target:
 * the landing page, auth surfaces, or a non-relative path.
 */
export function buildAuthHref(
  base: "/login" | "/signup",
  currentPath: string | null | undefined
): string {
  const next = buildAuthNext(currentPath);
  return next === null ? base : `${base}?next=${encodeURIComponent(next)}`;
}

/**
 * The `next` value an auth entry should carry — the current path + query —
 * or null when it isn't a meaningful return target (landing page, auth
 * surfaces, non-relative paths). AuthModalLink consumes this directly since
 * the modal carries `next` as a prop rather than a query param.
 */
export function buildAuthNext(
  currentPath: string | null | undefined
): string | null {
  if (!currentPath || !isRelativePath(currentPath)) return null;
  const pathname = currentPath.split("?")[0];
  if (pathname === "/") return null;
  if (
    NON_RETURN_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    return null;
  }
  return currentPath;
}
