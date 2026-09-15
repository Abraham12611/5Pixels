import { createClient } from "@/lib/supabase/server";
import { getPublicProducts } from "@/lib/db/explore";
import { EdgePage } from "@/components/edge/edge-page";
import { ProductCard } from "@/components/consumer/product-card";

/**
 * Unavailable/retired preset recovery — always leaves the visitor with real
 * alternatives instead of a dead end.
 */
export async function PresetNotFound() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: alternatives } = await getPublicProducts(
    undefined,
    undefined,
    undefined,
    undefined,
    "featured",
    1,
    4
  );

  return (
    <EdgePage
      title="This look isn't available"
      description="It may have been retired or renamed — but these are close."
      primaryAction={{ href: "/explore", label: "Explore presets" }}
      secondaryAction={{ href: "/app", label: "Back to Discover" }}
    >
      {alternatives.length > 0 && (
        <div className="mt-10 w-full max-w-4xl">
          <p className="text-text-muted mb-4 text-xs font-semibold uppercase tracking-wide">
            Try one of these instead
          </p>
          <div className="grid grid-cols-2 gap-4 text-left sm:grid-cols-4">
            {alternatives.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isAuthenticated={Boolean(user)}
                returnPath="/explore"
              />
            ))}
          </div>
        </div>
      )}
    </EdgePage>
  );
}
