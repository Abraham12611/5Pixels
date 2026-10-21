import type { NextConfig } from "next";

function getSupabaseImagePattern() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return {
      protocol: parsed.protocol.replace(":", "") as "http" | "https",
      hostname: parsed.hostname,
      port: parsed.port || "",
      pathname: "/storage/v1/object/public/**",
    };
  } catch {
    return null;
  }
}

const remotePatterns = [getSupabaseImagePattern()].filter(
  (pattern): pattern is NonNullable<typeof pattern> => pattern !== null
);

// Baseline hardening headers (#139). Kept to directives that cannot break
// rendering or checkout: no script/style CSP yet — that needs a nonce-based
// policy measured against Next inline payloads before shipping.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
  serverExternalPackages: ["sharp"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
