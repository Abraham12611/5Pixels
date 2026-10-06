export type PaymentProvider = "whop" | "creem";

/**
 * Active billing provider. Whop is the default; set
 * PAYMENT_PROVIDER=creem only as an emergency rollback.
 * Polar and Dodo integrations have been removed.
 */
export function getPaymentProvider(): PaymentProvider {
  const env = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  if (env === "creem") return "creem";
  return "whop";
}
