/**
 * Referral bonus amounts (fixed-credit denomination, 1 credit = $0.001 of
 * provider-cost capacity). Client-safe: plain constants with no server
 * imports, so marketing/onboarding surfaces and server grant logic share
 * one source of truth.
 */
export const REFERRER_SIGNUP_BONUS = 250;
export const REFEREE_SIGNUP_BONUS = 100;
