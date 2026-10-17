import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

/**
 * robots.txt — allow public surfaces, keep authenticated/staff/API routes
 * out of crawlers, and point at the sitemap. Reconcile with the GTM
 * indexing ticket (#121) when it lands.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/app",
          "/api",
          "/checkout",
          "/onboarding",
          "/auth",
          "/account-deleted",
          "/forgot-password",
          "/update-password",
          "/verify-email",
          "/maintenance",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
