/**
 * Referral-code helpers (07 §2A): 6-char codes from an unambiguous
 * alphabet, displayed grouped as K7M-2QX, matched case-insensitively
 * and separator-agnostic on input.
 */

/**
 * Input-side shape check — lenient on purpose: codes never contain
 * 0/1/I/L/O but a mistyped one is indistinguishable from a real lookup
 * miss, so we accept any 6 alphanumerics and let the DB decide.
 */
export const CODE_RE = /^[A-Z0-9]{6}$/i;

/** Strips separators/case so "k7m-2qx" and "K7M2QX" both match. */
export function normalizeReferralCode(input: string): string {
  return input.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function isReferralCode(input: string): boolean {
  return CODE_RE.test(normalizeReferralCode(input));
}

/** Display form: K7M2QX → K7M-2QX. Already-grouped input passes through. */
export function formatReferralCode(code: string): string {
  const normalized = normalizeReferralCode(code);
  if (normalized.length !== 6) return code;
  return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
}
