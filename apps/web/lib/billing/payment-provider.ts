export type PaymentProvider = "bachs" | "whop" | "creem";

/**
 * Active billing provider. Bachs is the default; set
 * PAYMENT_PROVIDER=whop or =creem only as an emergency rollback.
 * Polar and Dodo integrations have been removed.
 */
export function getPaymentProvider(): PaymentProvider {
  const env = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  if (env === "whop" || env === "creem") return env;
  return "bachs";
}
