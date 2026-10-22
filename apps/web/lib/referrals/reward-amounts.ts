/**
 * Referral bonus amounts (fixed-credit denomination, 1 credit = $0.01 of
 * provider-cost capacity). Client-safe: plain constants with no server
 * imports, so marketing/onboarding surfaces and server grant logic share
 * one source of truth.
 */
export const REFERRER_SIGNUP_BONUS = 25;
export const REFEREE_SIGNUP_BONUS = 10;

/**
 * Maximum referees a referrer earns rewards on (issue #110). Referrals
 * beyond the cap still attribute — the referee keeps their own bonuses —
 * but the referrer is paid for the first REFERRER_REWARD_CAP only.
 * Enforced atomically by the claim_referrer_reward RPC.
 */
export const REFERRER_REWARD_CAP = 15;
