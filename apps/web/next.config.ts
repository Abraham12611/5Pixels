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

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;
