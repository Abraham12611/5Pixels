export const supabaseUrl = (): string =>
  // A URL cannot contain whitespace; strip it everywhere, not just the
  // edges — a pasted env value with an embedded newline corrupts every
  // storage URL built from it (and breaks next/image's preload selector).
  // Trailing slashes are dropped so callers can safely append paths.
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
    .replace(/\s+/g, "")
    .replace(/\/+$/, "");

export const supabaseAnonKey = (): string =>
  (
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").trim() ||
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim()
  );
