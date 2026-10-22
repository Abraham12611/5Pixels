import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicProducts } from "@/lib/db/explore";
import {
  MODEL_LINES,
  resolveModelSection,
} from "@/lib/marketing/model-lines";
import { ModelPage } from "@/components/marketing/model-page";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

interface ModelPageRouteProps {
  params: Promise<{ slug: string }>;
}

function findLine(slug: string) {
  return MODEL_LINES.find((line) => line.slug === slug);
}

export async function generateMetadata({
  params,
}: ModelPageRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const line = findLine(slug);
  if (!line) {
    return { title: "Engine not found — 5Pixels" };
  }
  const title = `${line.name} — 5Pixels`;
  return {
    title,
    description: `${line.tagline} ${line.description}`,
    openGraph: { title, description: line.tagline, type: "website" },
    twitter: { card: "summary_large_image", title, description: line.tagline },
  };
}

export default async function ModelShowcasePage({
  params,
}: ModelPageRouteProps) {
  const { slug } = await params;
  const line = findLine(slug);
  if (!line) notFound();

  const supabase = await createClient();
  const [{ data: userData }, { data: products }] = await Promise.all([
    supabase.auth.getUser(),
    getPublicProducts(undefined, undefined, undefined, undefined, "featured", 1, 96),
  ]);

  const section = resolveModelSection(line, products);
  if (section.products.length === 0) notFound();

  const isAuthenticated = Boolean(userData.user);
  const otherLines = MODEL_LINES.filter((l) => l.slug !== line.slug).map(
    (l) => ({ name: l.name, tagline: l.tagline, pageHref: l.pageHref })
  );

  return (
    <>
      <ModelPage
        line={line}
        products={section.products}
        otherLines={otherLines}
        isAuthenticated={isAuthenticated}
      />
      {!isAuthenticated && <MarketingFooter isAuthenticated={false} />}
    </>
  );
}
