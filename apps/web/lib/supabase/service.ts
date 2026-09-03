import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

const serviceRoleKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

export function createServiceClient() {
  const url = supabaseUrl();
  const key = serviceRoleKey();
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL"
    );
  }
  if (!key.startsWith("eyJ")) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY does not look like a valid JWT");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
