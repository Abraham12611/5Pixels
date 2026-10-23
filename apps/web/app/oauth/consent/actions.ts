"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * OAuth consent decisions (#272) — approve/deny an authorization request
 * issued by the Supabase OAuth 2.1 server. Each action runs with the
 * owner's cookie session; the decision is recorded against THEIR account
 * and the returned redirect_url carries the auth code (or access_denied)
 * back to the MCP client (e.g. ChatGPT).
 */

export async function approveAuthorization(
  authorizationId: string
): Promise<{ redirect_url?: string; error?: string }> {
  if (!authorizationId) return { error: "Missing authorization id." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.oauth.approveAuthorization(
    authorizationId,
    { skipBrowserRedirect: true }
  );
  if (error) return { error: error.message };
  if (!("redirect_url" in data) || !data.redirect_url) {
    return { error: "No redirect URL returned by the authorization server." };
  }
  return { redirect_url: data.redirect_url };
}

export async function denyAuthorization(
  authorizationId: string
): Promise<{ redirect_url?: string; error?: string }> {
  if (!authorizationId) return { error: "Missing authorization id." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.oauth.denyAuthorization(
    authorizationId,
    { skipBrowserRedirect: true }
  );
  if (error) return { error: error.message };
  if (!("redirect_url" in data) || !data.redirect_url) {
    return { error: "No redirect URL returned by the authorization server." };
  }
  return { redirect_url: data.redirect_url };
}
