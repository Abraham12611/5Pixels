"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { buildAuthHref } from "@/lib/auth/return-path";

type AuthReturnLinkProps = Omit<React.ComponentProps<typeof Link>, "href"> & {
  href: "/login" | "/signup";
};

/**
 * Link to /login or /signup that carries `?next=<current path + query>` so
 * the visitor returns to exactly where they were after authenticating.
 * Falls back to the bare href on auth surfaces, the landing page, or when
 * search params aren't available.
 */
export function AuthReturnLink({ href, ...props }: AuthReturnLinkProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const current = search ? `${pathname}?${search}` : pathname;
  return <Link href={buildAuthHref(href, current)} {...props} />;
}
