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
  if (!currentPath || !isRelativePath(currentPath)) return base;
  const pathname = currentPath.split("?")[0];
  if (pathname === "/") return base;
  if (
    NON_RETURN_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    return base;
  }
  return `${base}?next=${encodeURIComponent(currentPath)}`;
}
