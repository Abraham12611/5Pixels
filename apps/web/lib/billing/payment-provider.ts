export type PaymentProvider = "creem" | "polar" | "dodo";

/**
 * Active billing provider. Creem is the default; set
 * PAYMENT_PROVIDER=polar|dodo only to roll back to a legacy provider.
 */
export function getPaymentProvider(): PaymentProvider {
  const env = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  if (env === "dodo") return "dodo";
  if (env === "polar") return "polar";
  return "creem";
}
