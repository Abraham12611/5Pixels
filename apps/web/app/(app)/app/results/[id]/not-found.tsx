import { EdgePage } from "@/components/edge/edge-page";

export default function ResultNotFound() {
  return (
    <EdgePage
      title="We couldn't find this result"
      description="It may have been deleted, or the link is incomplete."
      primaryAction={{ href: "/app/library", label: "Go to Library" }}
      secondaryAction={{ href: "/explore", label: "Explore presets" }}
    />
  );
}
