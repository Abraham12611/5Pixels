import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConsentForm } from "./consent-form";

/**
 * Supabase OAuth 2.1 consent screen (#272).
 *
 * Flow (per Supabase OAuth-server docs): an MCP client (e.g. the private
 * ChatGPT connector) sends the owner to
 * `{project}.supabase.co/auth/v1/oauth/authorize?...`. If no prior grant
 * exists, Supabase redirects here — the app's configured consent URL —
 * with `authorization_id`. We fetch the request details with the owner's
 * cookie session, render an explicit approve/deny choice, and send the
 * decision (and the owner, via redirect_url) back to the client.
 *
 * Not signed in → bounced to /login and returned here afterwards.
 * Already consented → `redirect_url` comes back instead of details and we
 * forward immediately.
 */
export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string }>;
}) {
  const { authorization_id: authorizationId } = await searchParams;
  if (!authorizationId) {
    return (
      <main className="mx-auto max-w-md px-6 py-24">
        <h1 className="text-cream-50 text-2xl font-bold">Invalid authorization request</h1>
        <p className="text-text-secondary mt-3 text-sm">
          This page must be reached through the OAuth authorization flow.
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/oauth/consent?authorization_id=${authorizationId}`)}`);
  }

  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

  if (error) {
    return (
      <main className="mx-auto max-w-md px-6 py-24">
        <h1 className="text-cream-50 text-2xl font-bold">Authorization unavailable</h1>
        <p className="text-text-secondary mt-3 text-sm">{error.message}</p>
      </main>
    );
  }

  // Prior grant or auto-approved — Supabase hands back the ready redirect.
  if (data && "redirect_url" in data && data.redirect_url) {
    redirect(data.redirect_url);
  }

  const details = data && "authorization_id" in data ? data : null;

  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <h1 className="text-cream-50 text-2xl font-bold">Authorize connector</h1>
      <p className="text-text-secondary mt-3 text-sm">
        An application is requesting access to your 5Pixels admin account
        through the Preset Factory connector.
      </p>

      <dl className="border-cream-100/10 bg-charcoal-850 mt-6 space-y-3 rounded-2xl border p-5 text-sm">
        <div>
          <dt className="text-text-secondary">Application</dt>
          <dd className="text-cream-50 mt-0.5 font-medium">
            {details?.client?.name ?? "OAuth client"}
          </dd>
        </div>
        {details?.redirect_uri && (
          <div>
            <dt className="text-text-secondary">Redirect destination</dt>
            <dd className="text-cream-50 mt-0.5 break-all font-mono text-xs">
              {details.redirect_uri}
            </dd>
          </div>
        )}
        {details?.scope && (
          <div>
            <dt className="text-text-secondary">Requested scopes</dt>
            <dd className="text-cream-50 mt-0.5 font-mono text-xs">{details.scope}</dd>
          </div>
        )}
        <div>
          <dt className="text-text-secondary">Signed in as</dt>
          <dd className="text-cream-50 mt-0.5 text-xs">{user.email ?? user.id}</dd>
        </div>
      </dl>

      <ConsentForm authorizationId={authorizationId} />
    </main>
  );
}
