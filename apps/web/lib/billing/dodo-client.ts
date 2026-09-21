import DodoPayments from "dodopayments";

function dodoEnvironment(): "test_mode" | "live_mode" {
  const env = process.env.DODO_PAYMENTS_ENVIRONMENT?.trim();
  return env === "live_mode" ? "live_mode" : "test_mode";
}

export function createDodoClient(): DodoPayments {
  const bearerToken = process.env.DODO_PAYMENTS_API_KEY?.trim();
  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim() ?? null;

  if (!bearerToken) {
    throw new Error("DODO_PAYMENTS_API_KEY is not set");
  }

  return new DodoPayments({
    bearerToken,
    webhookKey,
    environment: dodoEnvironment(),
  });
}
