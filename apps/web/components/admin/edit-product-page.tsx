import { requireAdmin } from "@/lib/db/admin";
import { getCategories } from "@/lib/db/categories";
import {
  getProductAssetPreviews,
  getProductById,
  getProductReferenceAssets,
  getEligibleParentPresets,
  getPresetFamilyForAdmin,
  attachReferenceAsset,
  detachReferenceAsset,
  publishProductVersion,
  rollbackProductVersion,
  transitionProductStatus,
  updateProduct,
  selectEditableVersion,
  resolveStaleVersions,
  duplicateProductAsVariant,
  reorderFamilyVariants,
  updateVariantSummary,
} from "@/lib/db/products";
import { getProviderModelCatalog } from "@/lib/db/provider-catalog";
import { ProductForm } from "./product-form";
import { type VersionSummary } from "./version-list";
import { ReferenceAssetManager } from "./reference-asset-manager";
import { FamilyPanel } from "./family-panel";
import { StaleDraftBanner } from "./stale-draft-banner";
import { selectStaleVersions } from "@/lib/admin/version-selection";
import { PublishingSection } from "./publishing-section";
import {
  EditorSectionGroup,
  REFERENCES_SECTION,
  PUBLISHING_SECTION,
} from "./editor-shell";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import type { ProductCreateInput } from "@5pixels/shared";
import { validatePublishGates } from "@/lib/validation/publish-gates";
import { getRouteCapability } from "@/lib/ai/route-capabilities";
import { isUserPromptReleased } from "@/lib/generation/user-prompt";
import { isMultiInputReleased } from "@/lib/generation/release-gates";
import { coerceCreditCost } from "@/lib/admin/coerce";
import { describeAdminSaveError } from "@/lib/admin/save-errors";

interface EditProductPageProps {
  id: string;
  type: "filter" | "poster";
}

export async function EditProductPage({ id, type }: EditProductPageProps) {
  const { profile } = await requireAdmin();
  const product = await getProductById(id);
  if (!product || product.type !== type) notFound();

  const [
    categories,
    assetPreviewById,
    referenceAssets,
    modelCatalog,
    eligibleResult,
    familyResult,
  ] = await Promise.all([
    getCategories(),
    getProductAssetPreviews([
      product.hero_asset_id,
      product.poster_asset_id,
      product.preview_video_asset_id,
      product.preview_gif_asset_id,
    ]),
    getProductReferenceAssets(id),
    getProviderModelCatalog(),
    getEligibleParentPresets(type, id),
    getPresetFamilyForAdmin(id),
  ]);

  const eligibleParents = eligibleResult.parents;
  const family = familyResult.family;
  const familySchemaAvailable =
    eligibleResult.familySchemaAvailable && familyResult.familySchemaAvailable;

  // Admin private reference assets share the route's input-image budget —
  // the multi-image config must fit in what remains.
  const adminReferenceCount = referenceAssets.filter((a) =>
    ["style_reference", "composition_reference", "layout_reference"].includes(
      a.role
    )
  ).length;

  const familyHeroUrls = await getProductAssetPreviews([
    family?.root.hero_asset_id,
    ...(family?.children ?? []).map((c) => c.hero_asset_id),
  ]);
  const heroUrlByProduct: Record<string, string> = {};
  if (family) {
    if (family.root.hero_asset_id && familyHeroUrls[family.root.hero_asset_id]) {
      heroUrlByProduct[family.root.id] = familyHeroUrls[family.root.hero_asset_id]!.publicUrl;
    }
    for (const child of family.children) {
      if (child.hero_asset_id && familyHeroUrls[child.hero_asset_id]) {
        heroUrlByProduct[child.id] = familyHeroUrls[child.hero_asset_id]!.publicUrl;
      }
    }
  }

  const versions = Array.isArray(product.product_versions)
    ? product.product_versions
    : [];
  const selectedVersion = await selectEditableVersion(
    versions.map((v: Record<string, unknown>) => ({
      id: String(v.id),
      state: String(v.state),
      version_number: Number(v.version_number),
    }))
  );
  const version = selectedVersion
    ? (versions.find(
        (v: Record<string, unknown>) => v.id === selectedVersion.id
      ) as Record<string, unknown> | undefined)
    : null;

  const fields = Array.isArray(product.product_fields)
    ? product.product_fields
    : [];

  // Postgres NUMERIC columns deserialize as strings (e.g. "1.0000") — coerce
  // once so the string never reaches zod's z.number() validation.
  const versionCreditCost = coerceCreditCost(version?.credit_cost);

  const metadata = (product.metadata ?? {}) as {
    filter_config?: ProductCreateInput["filter_config"];
    poster_config?: ProductCreateInput["poster_config"];
    prompt_ui?: ProductCreateInput["prompt_ui"];
  };

  const initialData: ProductCreateInput & { id?: string } = {
    id: product.id,
    type: product.type,
    slug: product.slug,
    name: product.name,
    short_description: product.short_description ?? undefined,
    long_description: product.long_description ?? undefined,
    public_prompt_recipe: product.public_prompt_recipe ?? undefined,
    category_id: product.category_id ?? undefined,
    public_status: product.public_status,
    visibility: product.visibility,
    hero_asset_id: product.hero_asset_id ?? undefined,
    poster_asset_id: product.poster_asset_id ?? undefined,
    preview_video_asset_id: product.preview_video_asset_id ?? undefined,
    preview_gif_asset_id: product.preview_gif_asset_id ?? undefined,
    likeness_level: product.likeness_level ?? undefined,
    featured_rank: product.featured_rank ?? undefined,
    credit_cost: versionCreditCost ?? Number(product.credit_cost ?? 0),
    parent_preset_id:
      (product.parent_preset_id as string | null | undefined) ?? undefined,
    standalone_discoverable: Boolean(product.standalone_discoverable),
    variant_display_name:
      (product.variant_display_name as string | null | undefined) ??
      undefined,
    variant_sort_order: Number(product.variant_sort_order ?? 0),
    prompt_ui: metadata.prompt_ui,
    version: {
      id: version?.id as string | undefined,
      version_number: (version?.version_number as number) ?? 1,
      state:
        (version?.state as ProductCreateInput["version"]["state"]) ?? "draft",
      private_instruction_template:
        (version?.private_instruction_template as string) ?? "",
      private_negative_instruction:
        (version?.private_negative_instruction as string | undefined) ??
        undefined,
      provider_strategy: (version?.provider_strategy as
        ProductCreateInput["version"]["provider_strategy"] | undefined) ?? {
        primary_provider: "",
        primary_model: "",
      },
      model_config:
        (version?.model_config as
          ProductCreateInput["version"]["model_config"] | undefined) ?? {},
      output_sizes:
        (version?.output_sizes as
          ProductCreateInput["version"]["output_sizes"] | undefined) ?? [],
      input_validation_config:
        (version?.input_validation_config as
          | ProductCreateInput["version"]["input_validation_config"]
          | undefined) ?? {},
      input_capability: {
        input_mode:
          ((version?.input_mode as "single" | "multi" | undefined) ??
            "single"),
        input_min_images: Number(version?.input_min_images ?? 1),
        input_max_images: Number(version?.input_max_images ?? 1),
        input_image_roles: Array.isArray(version?.input_image_roles)
          ? (version.input_image_roles as ProductCreateInput["version"]["input_capability"]["input_image_roles"])
          : [],
        prompt_override_enabled: Boolean(version?.prompt_override_enabled),
        prompt_max_chars: Number(version?.prompt_max_chars ?? 0),
      },
      post_process_config: (version?.post_process_config as
        ProductCreateInput["version"]["post_process_config"] | undefined) ?? {
        crop: false,
        format: "webp",
        quality: 90,
        metadata_stripped: true,
      },
      safety_config: (version?.safety_config as
        ProductCreateInput["version"]["safety_config"] | undefined) ?? {
        allowed_nsfw: false,
        block_public_figures: true,
        block_minors: true,
      },
      credit_cost: versionCreditCost ?? 1,
    },
    fields: fields.map(
      (f: {
        id: string;
        field_key: string;
        label: string;
        help_text: string | null;
        field_type: string;
        required: boolean;
        sort_order: number;
        config: unknown;
        validation: unknown;
        active: boolean;
      }) => ({
        id: f.id,
        field_key: f.field_key,
        label: f.label,
        help_text: f.help_text ?? undefined,
        field_type: f.field_type,
        required: f.required,
        sort_order: f.sort_order,
        config: f.config ?? {},
        validation: f.validation ?? {},
        active: f.active,
      })
    ),
    filter_config:
      product.type === "filter"
        ? (metadata.filter_config ?? {
            style_archetype: "",
            identity_preservation: "high",
          })
        : undefined,
    poster_config:
      product.type === "poster"
        ? (metadata.poster_config ?? {
            layout_template: "portrait",
            text_fields: [],
            text_layer_config: {
              position: "bottom",
              size: "medium",
              color: "#F7F2E8",
              alignment: "center",
            },
            background_handling: "replace",
          })
        : undefined,
  };

  const gateResult = validatePublishGates(
    {
      id: product.id,
      type: product.type,
      slug: product.slug,
      name: product.name,
      public_status: product.public_status,
      hero_asset_id: product.hero_asset_id ?? undefined,
      poster_asset_id: product.poster_asset_id ?? undefined,
      metadata,
      parent_preset_id:
        (product.parent_preset_id as string | null | undefined) ?? null,
      standalone_discoverable: Boolean(product.standalone_discoverable),
    },
    {
      id: version?.id as string | undefined,
      product_id: product.id,
      version_number: (version?.version_number as number) ?? 1,
      state: (version?.state as string) ?? "draft",
      provider_strategy: (version?.provider_strategy as Record<
        string,
        string
      >) ?? {
        primary_provider: "",
        primary_model: "",
      },
      credit_cost: versionCreditCost ?? 0,
      safety_config: (version?.safety_config as Record<string, unknown>) ?? {},
      input_mode:
        (version?.input_mode as "single" | "multi" | undefined) ?? "single",
      input_min_images: Number(version?.input_min_images ?? 1),
      input_max_images: Number(version?.input_max_images ?? 1),
      input_image_roles: Array.isArray(version?.input_image_roles)
        ? (version.input_image_roles as ProductCreateInput["version"]["input_capability"]["input_image_roles"])
        : [],
      prompt_override_enabled: Boolean(version?.prompt_override_enabled),
      prompt_max_chars: Number(version?.prompt_max_chars ?? 0),
    },
    initialData.fields,
    {
      parent:
        family && product.parent_preset_id
          ? {
              id: family.root.id,
              type,
              public_status: family.root.public_status,
              parent_preset_id: family.root.parent_preset_id,
            }
          : null,
      routeCapability: getRouteCapability(
        (version?.provider_strategy as Record<string, string> | undefined)
          ?.primary_provider,
        (version?.provider_strategy as Record<string, string> | undefined)
          ?.primary_model
      ),
      adminReferenceCount,
      userPromptReleased: isUserPromptReleased(),
      multiInputReleased: isMultiInputReleased(),
    }
  );

  const activeVersion = versions.find(
    (v: Record<string, unknown>) => v.state === "active"
  );

  // Live vs editing (#251): the header always shows which version customers
  // actually use (active) next to the version this editor loaded. Drafts
  // numbered below the live version are stale leftovers — flagged loudly and
  // resolvable only through the explicit discard/rebase workflow.
  const routeLabel = (v: Record<string, unknown> | null | undefined) => {
    const strategy = v?.provider_strategy as
      | { primary_provider?: string; primary_model?: string }
      | undefined;
    return (
      [strategy?.primary_provider, strategy?.primary_model]
        .filter(Boolean)
        .join("/") || "route unset"
    );
  };
  const staleVersionIds = new Set(
    selectStaleVersions(
      versions.map((v: Record<string, unknown>) => ({
        id: String(v.id),
        state: String(v.state),
        version_number: Number(v.version_number),
      }))
    ).map((v) => v.id)
  );
  const staleVersions = versions
    .filter((v: Record<string, unknown>) => staleVersionIds.has(String(v.id)))
    .map((v: Record<string, unknown>) => ({
      version_number: Number(v.version_number),
      route: routeLabel(v),
    }));

  // Legacy incomplete presets (#233): a product row with no version at all
  // cannot be saved — the atomic write RPC fails closed on a missing
  // editable source. Explain the state and block pointless submissions
  // instead of letting the form round-trip into a generic error.
  const hasEditableVersion = Boolean(version?.id);

  const versionSummaries: VersionSummary[] = versions.map(
    (v: Record<string, unknown>) => ({
      id: String(v.id),
      version_number: Number(v.version_number),
      state: String(v.state),
      published_at: v.published_at
        ? new Date(String(v.published_at)).toISOString()
        : null,
      credit_cost: Number(v.credit_cost ?? 0),
      provider_strategy: (v.provider_strategy as VersionSummary["provider_strategy"]) ?? {
        primary_provider: "",
        primary_model: "",
      },
      private_instruction_template: String(
        v.private_instruction_template ?? ""
      ),
      private_negative_instruction: (v.private_negative_instruction as string | null) ?? null,
      model_config: (v.model_config as Record<string, unknown>) ?? {},
      input_validation_config:
        (v.input_validation_config as Record<string, unknown>) ?? {},
      post_process_config:
        (v.post_process_config as Record<string, unknown>) ?? {},
      safety_config: (v.safety_config as Record<string, unknown>) ?? {},
    })
  );

  const listHref = type === "filter" ? "/admin/filters" : "/admin/posters";
  const typeLabel = type === "filter" ? "Filter" : "Poster";

  return (
    <>
      <div className="mb-6">
        <Link
          href={listHref}
          className="text-text-muted hover:text-cream-100 inline-flex items-center gap-0.5 rounded-md py-0.5 text-[13px] transition-colors"
        >
          <CaretLeft size={14} />
          {type === "filter" ? "Filters" : "Posters"}
        </Link>
        <h1 className="text-cream-50 wrap-anywhere mt-2 text-3xl font-bold">
          {product.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
          <span className="text-text-muted wrap-anywhere">{product.slug}</span>
          <span className="bg-charcoal-700 text-cream-100 rounded-full px-2 py-0.5 text-xs font-medium">
            {typeLabel}
          </span>
          <span className="bg-charcoal-700 text-cream-100 rounded-full px-2 py-0.5 text-xs font-medium">
            Status: {product.public_status}
          </span>
          {activeVersion && (
            <span className="bg-lime-500/20 text-lime-400 rounded-full px-2 py-0.5 text-xs font-medium">
              Live v{Number(activeVersion.version_number)} ·{" "}
              {routeLabel(activeVersion)}
            </span>
          )}
          <span className="bg-charcoal-700 text-cream-100 rounded-full px-2 py-0.5 text-xs font-medium">
            Editing v{initialData.version.version_number} ·{" "}
            {initialData.version.state}
            {version?.id && activeVersion?.id === version.id
              ? " (live)"
              : ` · ${routeLabel(version)}`}
          </span>
        </div>
      </div>

      {staleVersions.length > 0 && activeVersion && (
        <div className="mb-6">
          <StaleDraftBanner
            productId={id}
            liveVersion={{
              version_number: Number(activeVersion.version_number),
              route: routeLabel(activeVersion),
            }}
            staleVersions={staleVersions}
            resolve={resolveStaleVersions}
          />
        </div>
      )}

      {!hasEditableVersion && (
        <div
          role="alert"
          className="border-warning/40 bg-warning/10 text-warning mb-6 rounded-xl border px-4 py-3 text-sm"
        >
          <p className="font-semibold">This preset is incomplete</p>
          <p className="mt-1">
            {product.name} has no saved version — there is no recipe to edit,
            so saving and publishing are unavailable. The record must be
            repaired or replaced (for example with a new variant) before it
            can change. Any values you edit below are kept, but cannot be
            saved in this state.
          </p>
        </div>
      )}

      {family && (family.children.length > 0 || product.parent_preset_id || product.public_status !== "retired") && (
        <div className="mb-6">
          <FamilyPanel
            currentProductId={id}
            type={type}
            root={family.root}
            children_={family.children}
            heroUrls={heroUrlByProduct}
            reorder={reorderFamilyVariants}
            createVariant={async (parentId) => {
              "use server";
              const created = await duplicateProductAsVariant(parentId);
              return { id: created.id };
            }}
            updateVariant={async (productId, patch) => {
              "use server";
              await updateVariantSummary(productId, patch);
            }}
          />
        </div>
      )}

      <ProductForm
        type={type}
        initialData={initialData}
        categories={categories}
        modelCatalog={modelCatalog}
        eligibleParents={eligibleParents}
        familySchemaAvailable={familySchemaAvailable}
        hasChildren={(family?.children.length ?? 0) > 0}
        adminReferenceCount={adminReferenceCount}
        currentParent={
          family && product.parent_preset_id
            ? {
                id: family.root.id,
                type,
                public_status: family.root.public_status,
                parent_preset_id: family.root.parent_preset_id,
              }
            : null
        }
        additionalSections={[REFERENCES_SECTION, PUBLISHING_SECTION]}
        assetPreviews={{
          hero: product.hero_asset_id
            ? assetPreviewById[product.hero_asset_id]
            : undefined,
          poster: product.poster_asset_id
            ? assetPreviewById[product.poster_asset_id]
            : undefined,
          "preview-video": product.preview_video_asset_id
            ? assetPreviewById[product.preview_video_asset_id]
            : undefined,
          "preview-gif": product.preview_gif_asset_id
            ? assetPreviewById[product.preview_gif_asset_id]
            : undefined,
        }}
        saveDisabledReason={
          hasEditableVersion
            ? undefined
            : "This preset has no saved version — it must be repaired or replaced."
        }
        onSubmit={async (data) => {
          "use server";
          try {
            await updateProduct(id, data);
            return { id };
          } catch (error) {
            // Expected rejections (no editable source, permissions, missing
            // rows) return as data — a thrown error would reach the client
            // as a minified React digest instead of an explanation.
            console.error("[admin] product save failed", error);
            return { error: describeAdminSaveError(error) };
          }
        }}
      >
        <EditorSectionGroup id="references" className="mt-8">
          <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-4 sm:p-6">
            <h2 className="text-cream-50 mb-4 text-lg font-semibold">
              Reference assets
            </h2>
            <p className="text-text-muted mb-4 text-xs">
              Private images the AI recipe can draw on (style, composition,
              layout). They count against the route&apos;s input-image budget
              configured under Inputs &amp; controls.
            </p>
            <ReferenceAssetManager
              productId={id}
              initialAssets={referenceAssets}
              onAttach={attachReferenceAsset}
              onDetach={detachReferenceAsset}
            />
          </section>
        </EditorSectionGroup>

        <EditorSectionGroup id="publishing" className="mt-8">
          <PublishingSection
            productId={id}
            status={product.public_status}
            versionId={initialData.version.id}
            isOwner={!!profile.is_owner}
            gateFailures={gateResult.ok ? [] : gateResult.failures}
            activeVersionId={activeVersion?.id as string | undefined}
            rollbackVersions={versions.map(
              (v: Record<string, unknown>) => ({
                id: String(v.id),
                version_number: Number(v.version_number),
                state: String(v.state),
                published_at: v.published_at
                  ? new Date(String(v.published_at)).toISOString()
                  : null,
              })
            )}
            versionSummaries={versionSummaries}
            selectedVersionId={initialData.version.id}
            publish={publishProductVersion}
            rollback={rollbackProductVersion}
            transitionStatus={transitionProductStatus}
          />
        </EditorSectionGroup>
      </ProductForm>
    </>
  );
}
