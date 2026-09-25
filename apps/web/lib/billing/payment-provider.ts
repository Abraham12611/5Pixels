export type PaymentProvider = "polar" | "dodo";

export function getPaymentProvider(): PaymentProvider {
  const env = process.env.PAYMENT_PROVIDER?.trim();
  return env === "dodo" ? "dodo" : "polar";
}
