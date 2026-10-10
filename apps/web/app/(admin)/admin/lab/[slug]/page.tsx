import { notFound } from "next/navigation";
import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { requireAdmin } from "@/lib/db/admin";
import { getAdminProductBySlug } from "@/lib/db/products";
import { getUserCreditBalance } from "@/lib/generation/balance";
import { getProviderModelCatalog } from "@/lib/db/provider-catalog";
import { getProviderEndpoint } from "@/lib/ai/provider-routing";
import { createServiceClient } from "@/lib/supabase/service";
import { getFreshSnapshot } from "@/lib/pricing/snapshots";
import { getActivePricingPolicy } from "@/lib/pricing/policy";
import type { SnapshotPayload } from "@/lib/pricing/types";
import { LabWorkspace } from "@/components/admin/lab-workspace";
import type { ProviderStrategy } from "@/lib/ai/provider-routing";

export default async function AdminTestLabDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;

  const product = await getAdminProductBySlug(slug);
  if (!product) notFound();

  const [balance, catalog, policy] = await Promise.all([
    getUserCreditBalance(),
    getProviderModelCatalog(),
    getActivePricingPolicy(createServiceClient()),
  ]);

  // The preset's configured primary endpoint is pre-checked in the picker, and
  // its private recipe is shown (admin-only) so tests can override it.
  let defaultEndpointId: string | null = null;
  let recipe: {
    instruction: string;
    negative: string | null;
    modelConfig: Record<string, unknown>;
  } | null = null;
  if (product.version_id) {
    const service = createServiceClient();
    const { data: version } = await service
      .from("product_versions")
      .select(
        "provider_strategy, private_instruction_template, private_negative_instruction, model_config"
      )
      .eq("id", product.version_id)
      .single();
    const strategy = version?.provider_strategy as ProviderStrategy | undefined;
    defaultEndpointId = strategy ? getProviderEndpoint(strategy) : null;
    recipe = {
      instruction:
        (version?.private_instruction_template as string | null) ?? "",
      negative:
        (version?.private_negative_instruction as string | null) ?? null,
      modelConfig: (version?.model_config ?? {}) as Record<string, unknown>,
    };
  }

  // Presets transform a source photo — only image-to-image endpoints can run.
  const i2iModels = catalog.filter((m) => m.category === "image-to-image");

  // Fresh pricing payloads per endpoint so the picker can show real
  // quote-based estimates. Endpoints without a fresh snapshot are simply
  // absent from the map — the workspace marks them unpriced (runs still
  // fail closed server-side if selected).
  const service = createServiceClient();
  const pricingEntries = await Promise.all(
    i2iModels.map(async (m) => {
      const snap = await getFreshSnapshot(service, m.provider, m.endpointId);
      return [m.endpointId, snap?.payload ?? null] as const;
    })
  );
  const pricing: Record<string, SnapshotPayload> = {};
  for (const [endpointId, payload] of pricingEntries) {
    if (payload) pricing[endpointId] = payload;
  }

  return (
    <>
      <div className="mb-6">
        <Link
          href="/admin/lab"
          className="text-text-muted hover:text-cream-100 inline-flex items-center gap-0.5 rounded-md py-0.5 text-[13px] transition-colors"
        >
          <CaretLeft size={14} />
          Test lab
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-cream-50 text-3xl font-bold">
              Test {product.name}
            </h1>
            <p className="text-text-secondary mt-1 max-w-2xl text-sm">
              {product.short_description || product.long_description}
            </p>
          </div>
          <span className="border-cream-100/10 bg-charcoal-850 text-text-secondary rounded-full border px-3.5 py-1.5 text-xs font-medium">
            {product.type} · v{product.version_number}
          </span>
        </div>
      </div>

      <div className="border-warning/30 bg-warning/10 mb-6 rounded-2xl border p-4">
        <p className="text-warning text-sm">
          <strong>Admin test run.</strong> Each model run charges your personal
          balance at that model&apos;s rate and stores a real generation in your
          history — identical to what a consumer would receive.
        </p>
      </div>

      <LabWorkspace
        product={product}
        models={i2iModels}
        defaultEndpointId={defaultEndpointId}
        initialBalance={balance}
        pricing={pricing}
        slackFactor={policy?.quoteMaxSlackFactor ?? 1.15}
        recipe={recipe}
      />
    </>
  );
}
