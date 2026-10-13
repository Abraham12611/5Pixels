import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { asService, asUser } from "./db";

/**
 * Financial-fixture builders. Everything is inserted through real SQL so the
 * tests exercise actual constraints, triggers and RPCs — nothing here mocks
 * or bypasses production logic. Each builder uses unique ids so tests can
 * run in any order without truncating shared state.
 */

export interface TestUser {
  userId: string;
}

/** auth.users row — the on_auth_user_created trigger builds the profile. */
export async function makeUser(client: Client): Promise<TestUser> {
  const userId = randomUUID();
  await client.query(
    `INSERT INTO auth.users (
       id, instance_id, aud, role, email, encrypted_password,
       email_confirmed_at, created_at, updated_at,
       raw_app_meta_data, raw_user_meta_data
     ) VALUES (
       $1, '00000000-0000-0000-0000-000000000000',
       'authenticated', 'authenticated', $2, '',
       NOW(), NOW(), NOW(), '{}'::jsonb, '{}'::jsonb
     )`,
    [userId, `dbtest-${userId}@example.invalid`]
  );
  return { userId };
}

export async function grantCredits(
  client: Client,
  userId: string,
  amount: number
): Promise<void> {
  await client.query(
    `INSERT INTO public.credit_ledger
       (user_id, entry_type, amount, idempotency_key, metadata)
     VALUES ($1, 'purchase', $2, $3, '{"source": "db-test"}'::jsonb)`,
    [userId, amount, `grant:${randomUUID()}`]
  );
}

export interface TestProduct {
  productId: string;
  productVersionId: string;
}

export async function makeProduct(client: Client): Promise<TestProduct> {
  const productId = randomUUID();
  const productVersionId = randomUUID();
  await client.query(
    `INSERT INTO public.products (id, type, slug, name, public_status, visibility)
     VALUES ($1, 'filter', $2, $3, 'active', 'public')`,
    [
      productId,
      `dbtest-${productId.slice(0, 8)}`,
      `DB Test ${productId.slice(0, 8)}`,
    ]
  );
  await client.query(
    `INSERT INTO public.product_versions (
       id, product_id, version_number, state, private_instruction_template,
       credit_cost
     ) VALUES ($1, $2, 1, 'active', 'db-test instruction', 0)`,
    [productVersionId, productId]
  );
  return { productId, productVersionId };
}

/** Minimal user-owned asset row in the user-assets bucket. */
export async function makeAsset(
  client: Client,
  ownerId: string,
  opts: { width?: number; height?: number } = {}
): Promise<string> {
  const id = randomUUID();
  await client.query(
    `INSERT INTO public.assets (
       id, owner_user_id, storage_provider, storage_key, bucket,
       media_type, mime_type, width, height
     ) VALUES ($1, $2, 'supabase', $3, 'user-assets', 'image', 'image/png', $4, $5)`,
    [id, ownerId, `dbtest/${id}.png`, opts.width ?? 1024, opts.height ?? 1024]
  );
  return id;
}

export interface TestSnapshot {
  snapshotId: string;
  endpointId: string;
}

export async function makeSnapshot(
  client: Client,
  opts: {
    provider?: string;
    endpointId?: string;
    pricingType?: string;
    unitPriceUsd?: number;
  } = {}
): Promise<TestSnapshot> {
  const snapshotId = randomUUID();
  const endpointId =
    opts.endpointId ?? `fal-ai/dbtest/${randomUUID().slice(0, 8)}`;
  await client.query(
    `INSERT INTO public.provider_pricing_snapshots
       (id, fetched_at, expires_at, provider, endpoint_id, payload, source)
     VALUES ($1, NOW(), NOW() + INTERVAL '6 hours', $2, $3, $4, 'db-test')`,
    [
      snapshotId,
      opts.provider ?? "fal",
      endpointId,
      JSON.stringify({
        pricing_type: opts.pricingType ?? "flat_per_request",
        unit_price: opts.unitPriceUsd ?? 0.05,
      }),
    ]
  );
  return { snapshotId, endpointId };
}

export interface TestQuote {
  quoteId: string;
  reserveCredits: number;
  maximumCostUsd: number;
  expectedCostUsd: number;
}

export async function makeQuote(
  client: Client,
  opts: {
    userId: string;
    productId: string;
    productVersionId: string;
    snapshotId: string;
    endpointId: string;
    provider?: string;
    options?: Record<string, unknown>;
    expectedCostUsd?: number;
    maximumCostUsd?: number;
    reserveCredits?: number;
    expiresInSeconds?: number;
    width?: number;
    height?: number;
  }
): Promise<TestQuote> {
  const quoteId = randomUUID();
  const options = opts.options ?? {};
  const expectedCostUsd = opts.expectedCostUsd ?? 0.08;
  const maximumCostUsd = opts.maximumCostUsd ?? 0.1;
  const reserveCredits = opts.reserveCredits ?? 10;
  const policy = await client.query(
    `SELECT version FROM public.pricing_policies WHERE is_active LIMIT 1`
  );
  await client.query(
    `INSERT INTO public.generation_quotes (
       id, user_id, product_id, product_version_id, provider, endpoint_id,
       allowed_endpoint_ids, expected_cost_usd, maximum_cost_usd,
       reserve_credits, pricing_snapshot_id, policy_version, params,
       options_fingerprint, expires_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, ARRAY[$6], $7, $8, $9, $10, $11, $12,
       public.options_fingerprint($13::jsonb), NOW() + ($14 || ' seconds')::interval
     )`,
    [
      quoteId,
      opts.userId,
      opts.productId,
      opts.productVersionId,
      opts.provider ?? "fal",
      opts.endpointId,
      expectedCostUsd,
      maximumCostUsd,
      reserveCredits,
      opts.snapshotId,
      policy.rows[0]?.version ?? 2,
      JSON.stringify({
        width: opts.width ?? 1024,
        height: opts.height ?? 1024,
        primary_components: {},
      }),
      JSON.stringify(options),
      String(opts.expiresInSeconds ?? 600),
    ]
  );
  return { quoteId, reserveCredits, maximumCostUsd, expectedCostUsd };
}

export interface CreatedGeneration {
  generationId: string;
  status: string;
  processingToken: string;
  balanceAfter: number;
  creditCost: number;
}

/** Calls the real RPC as the owning user (authenticated role + jwt claims). */
export async function createGeneration(
  client: Client,
  opts: {
    userId: string;
    quoteId: string;
    sourceAssetId: string;
    options?: Record<string, unknown>;
  }
): Promise<CreatedGeneration> {
  return asUser(client, opts.userId, async () => {
    const res = await client.query(
      `SELECT * FROM public.create_generation($1::uuid, $2::uuid, $3::jsonb, $4)`,
      [
        opts.quoteId,
        opts.sourceAssetId,
        JSON.stringify(opts.options ?? {}),
        `idem-${randomUUID()}`,
      ]
    );
    const row = res.rows[0];
    return {
      generationId: row.generation_id,
      status: row.status,
      processingToken: row.processing_token,
      balanceAfter: Number(row.balance_after),
      creditCost: Number(row.credit_cost),
    };
  });
}

export async function attachProviderRequest(
  client: Client,
  opts: {
    userId: string;
    generationId: string;
    token: string;
    requestId: string;
    endpointId: string;
  }
): Promise<void> {
  await asUser(client, opts.userId, async () => {
    await client.query(
      `SELECT * FROM public.attach_provider_request($1::uuid, $2, $3, $4)`,
      [opts.generationId, opts.token, opts.requestId, opts.endpointId]
    );
  });
}

/** Marks the generation in-flight so complete_generation accepts it. */
export async function markGenerating(
  client: Client,
  generationId: string
): Promise<void> {
  await client.query(
    `UPDATE public.generations SET status = 'generating' WHERE id = $1`,
    [generationId]
  );
}

export async function completeGeneration(
  client: Client,
  opts: {
    userId: string;
    generationId: string;
    token: string;
    outputAssetId: string;
  }
): Promise<void> {
  await asUser(client, opts.userId, async () => {
    await client.query(
      `SELECT * FROM public.complete_generation($1::uuid, $2, $3::uuid)`,
      [opts.generationId, opts.token, opts.outputAssetId]
    );
  });
}

export async function failGeneration(
  client: Client,
  opts: { userId: string; generationId: string; token: string }
): Promise<void> {
  await asUser(client, opts.userId, async () => {
    await client.query(
      `SELECT * FROM public.fail_generation_refund($1::uuid, $2, 'db_test_failure', 'generation')`,
      [opts.generationId, opts.token]
    );
  });
}

/** Invokes the real reconcile RPC as service_role. Returns its result text. */
export async function reconcileEvent(
  client: Client,
  opts: {
    requestId: string;
    endpointId: string;
    costTotalUsd: number;
    provider?: string;
    unitPriceUsd?: number;
    outputUnits?: number;
  }
): Promise<string> {
  return asService(client, async () => {
    const res = await client.query(
      `SELECT public.reconcile_billing_event(
         $1, $2, $3, NOW(), $4, 'request', $5, 0,
         $6::numeric(12,8), 0, $6::numeric(12,8), $7::jsonb
       )`,
      [
        opts.provider ?? "fal",
        opts.requestId,
        opts.endpointId,
        opts.outputUnits ?? 1,
        opts.unitPriceUsd ?? opts.costTotalUsd,
        opts.costTotalUsd,
        JSON.stringify({ source: "db-test" }),
      ]
    );
    return res.rows[0].reconcile_billing_event as string;
  });
}

export async function settleUnbilled(
  client: Client,
  completedBefore: Date
): Promise<number> {
  return asService(client, async () => {
    const res = await client.query(
      `SELECT public.settle_unbilled_generations($1, 200)`,
      [completedBefore]
    );
    return Number(res.rows[0].settle_unbilled_generations);
  });
}

// ---------------------------------------------------------------------------
// Composite lifecycle builder + read models
// ---------------------------------------------------------------------------

export interface QuotedGeneration {
  userId: string;
  productId: string;
  productVersionId: string;
  snapshotId: string;
  endpointId: string;
  quoteId: string;
  sourceAssetId: string;
  generationId: string;
  processingToken: string;
  requestId: string;
  reserveCredits: number;
  maximumCostUsd: number;
}

/**
 * Drives the real pipeline to a completed, provider-attached generation:
 * user -> product -> snapshot -> quote -> create_generation (RPC) ->
 * mark generating -> attach_provider_request (RPC) -> output asset ->
 * complete_generation (RPC). Reserve is held open afterwards.
 */
export async function makeCompletedGeneration(
  client: Client,
  opts: {
    grantCredits?: number;
    reserveCredits?: number;
    expectedCostUsd?: number;
    maximumCostUsd?: number;
    unitPriceUsd?: number;
  } = {}
): Promise<QuotedGeneration> {
  const { userId } = await makeUser(client);
  await grantCredits(client, userId, opts.grantCredits ?? 20);
  const { productId, productVersionId } = await makeProduct(client);
  const { snapshotId, endpointId } = await makeSnapshot(client, {
    unitPriceUsd: opts.unitPriceUsd ?? 0.05,
  });
  const quote = await makeQuote(client, {
    userId,
    productId,
    productVersionId,
    snapshotId,
    endpointId,
    expectedCostUsd: opts.expectedCostUsd,
    maximumCostUsd: opts.maximumCostUsd,
    reserveCredits: opts.reserveCredits,
  });
  const sourceAssetId = await makeAsset(client, userId);
  const created = await createGeneration(client, {
    userId,
    quoteId: quote.quoteId,
    sourceAssetId,
  });
  const requestId = `req-${randomUUID()}`;
  await attachProviderRequest(client, {
    userId,
    generationId: created.generationId,
    token: created.processingToken,
    requestId,
    endpointId,
  });
  await markGenerating(client, created.generationId);
  const outputAssetId = await makeAsset(client, userId);
  await completeGeneration(client, {
    userId,
    generationId: created.generationId,
    token: created.processingToken,
    outputAssetId,
  });
  return {
    userId,
    productId,
    productVersionId,
    snapshotId,
    endpointId,
    quoteId: quote.quoteId,
    sourceAssetId,
    generationId: created.generationId,
    processingToken: created.processingToken,
    requestId,
    reserveCredits: quote.reserveCredits,
    maximumCostUsd: quote.maximumCostUsd,
  };
}

export interface GenerationRow {
  status: string;
  credit_cost: string | null;
  actual_credit_cost: string | null;
  provisional_credit_cost: string | null;
  billing_reconcile_state: string | null;
  billing_reconciled_at: string | null;
  provider_cost_usd: string | null;
  provider_endpoint: string | null;
  provider_request_id: string | null;
  quote_id: string | null;
}

export async function generationOf(
  client: Client,
  generationId: string
): Promise<GenerationRow> {
  const res = await client.query(
    `SELECT status, credit_cost::text, actual_credit_cost::text,
            provisional_credit_cost::text, billing_reconcile_state,
            billing_reconciled_at::text, provider_cost_usd::text,
            provider_endpoint, provider_request_id, quote_id
     FROM public.generations WHERE id = $1`,
    [generationId]
  );
  return res.rows[0];
}

export interface LedgerRow {
  entry_type: string;
  amount: string;
  idempotency_key: string | null;
  metadata: Record<string, unknown>;
}

export async function ledgerOf(
  client: Client,
  generationId: string
): Promise<LedgerRow[]> {
  const res = await client.query(
    `SELECT entry_type, amount::text, idempotency_key, metadata
     FROM public.credit_ledger WHERE generation_id = $1
     ORDER BY created_at, id`,
    [generationId]
  );
  return res.rows;
}

export async function balanceOf(
  client: Client,
  userId: string
): Promise<number> {
  const res = await client.query(
    `SELECT COALESCE(SUM(amount), 0)::numeric AS balance
     FROM public.credit_ledger WHERE user_id = $1`,
    [userId]
  );
  return Number(res.rows[0].balance);
}
