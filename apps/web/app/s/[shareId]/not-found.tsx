import { EdgePage } from "@/components/edge/edge-page";

export default function SharedLinkNotFound() {
  return (
    <EdgePage
      title="This shared link has expired"
      description="Shared links can be turned off by their owner, or the result may have been removed."
      primaryAction={{ href: "/explore", label: "Explore presets" }}
      secondaryAction={{ href: "/", label: "Back to 5Pixels" }}
    />
  );
}
