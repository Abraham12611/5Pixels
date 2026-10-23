import { Client } from "pg";

/**
 * Direct Postgres access for the financial-integration suite.
 *
 * Connects to the Supabase CLI local Postgres (`supabase db start`) as the
 * superuser. `request.jwt.claims` + `SET LOCAL ROLE` impersonate real
 * PostgREST-scoped requests so `auth.uid()`, `authenticated`, and
 * `service_role` behave exactly as they do through the API gateway — nothing
 * about the security model is mocked.
 */

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export async function withDb<T>(
  fn: (client: Client) => Promise<T>
): Promise<T> {
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  // Mirror the PostgREST request environment: Supabase sessions resolve
  // unqualified names against public + extensions (pgcrypto lives there).
  // Without this, direct-pg calls fail on things that work fine remotely.
  await client.query("SET search_path TO public, extensions");
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** Opens `n` concurrent connections for lock/race coverage. */
export async function withDbClients<T>(
  n: number,
  fn: (clients: Client[]) => Promise<T>
): Promise<T> {
  const clients = await Promise.all(
    Array.from({ length: n }, async () => {
      const client = new Client({ connectionString: TEST_DATABASE_URL });
      await client.connect();
      await client.query("SET search_path TO public, extensions");
      return client;
    })
  );
  try {
    return await fn(clients);
  } finally {
    await Promise.all(clients.map((c) => c.end()));
  }
}

export type JwtRole = "authenticated" | "service_role" | "anon";

/**
 * Runs `fn` inside one transaction as `role` with `auth.uid()` = userId.
 * Rolls back on any error so a failed test never leaks half-committed state.
 */
export async function asRole<T>(
  client: Client,
  role: JwtRole,
  userId: string | null,
  fn: () => Promise<T>,
  extraClaims?: Record<string, unknown>
): Promise<T> {
  await client.query("BEGIN");
  try {
    // PostgREST always forwards a `role` claim (anon JWTs included); set it
    // unconditionally so auth.role() resolves like a real API request.
    await client.query("SELECT set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({
        ...(userId ? { sub: userId } : {}),
        role,
        ...extraClaims,
      }),
    ]);
    await client.query(`SET LOCAL ROLE ${role}`);
    const result = await fn();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export function asUser<T>(
  client: Client,
  userId: string,
  fn: () => Promise<T>
): Promise<T> {
  return asRole(client, "authenticated", userId, fn);
}

/**
 * Authenticated request carrying an OAuth-server `client_id` claim —
 * simulates an MCP/connector-issued token (the Supabase OAuth server
 * stamps client_id; web/session tokens don't).
 */
export function asOAuthUser<T>(
  client: Client,
  userId: string,
  fn: () => Promise<T>,
  clientId = "test-oauth-client"
): Promise<T> {
  return asRole(client, "authenticated", userId, fn, {
    client_id: clientId,
  });
}

export function asService<T>(client: Client, fn: () => Promise<T>): Promise<T> {
  return asRole(client, "service_role", null, fn);
}

/** Anonymous PostgREST request — JWT with `role: "anon"` and no `sub`. */
export function asAnon<T>(client: Client, fn: () => Promise<T>): Promise<T> {
  return asRole(client, "anon", null, fn);
}
