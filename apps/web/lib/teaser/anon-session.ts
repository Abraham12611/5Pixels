// Server-only helpers — imported by server actions and route handlers, never
// by client components.
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

export const ANON_SESSION_COOKIE = "spx_anon";

/**
 * Reads the anonymous-session cookie. Returns null when unset — casual
 * browsing stays cookieless; the cookie is only minted at first upload
 * (08 §5).
 */
export async function getAnonSessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(ANON_SESSION_COOKIE)?.value ?? null;
}

/**
 * Server-action only: returns the existing anon session id or mints one.
 * Cookie is first-party, 30d, httpOnly — it never carries data, just the id.
 */
export async function getOrCreateAnonSessionId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(ANON_SESSION_COOKIE)?.value;
  if (existing) return existing;

  const id = uuidv4();
  store.set(ANON_SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return id;
}
