import { describe, expect, it } from "vitest";
import { supabaseAnonKey, supabaseUrl } from "./env";

describe("supabase env helpers", () => {
  it("read NEXT_PUBLIC_SUPABASE_URL", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    expect(supabaseUrl()).toBe("https://test.supabase.co");
  });

  it("prefer NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY over legacy anon key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy";
    expect(supabaseAnonKey()).toBe("publishable");
  });

  it("fall back to NEXT_PUBLIC_SUPABASE_ANON_KEY", () => {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy";
    expect(supabaseAnonKey()).toBe("legacy");
  });
});
