import { EdgePage } from "@/components/edge/edge-page";

export default function GenerationNotFound() {
  return (
    <EdgePage
      title="We couldn't find this transformation"
      description="It may have been deleted, or the link is incomplete."
      primaryAction={{ href: "/app/library", label: "Go to Library" }}
      secondaryAction={{ href: "/explore", label: "Explore presets" }}
    />
  );
}
