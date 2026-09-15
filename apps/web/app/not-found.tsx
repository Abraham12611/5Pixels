import { EdgePage } from "@/components/edge/edge-page";

export default function NotFound() {
  return (
    <EdgePage
      title="This page isn't here"
      description="The page you're looking for doesn't exist or has moved."
      primaryAction={{ href: "/app", label: "Go to Discover" }}
      secondaryAction={{ href: "/explore", label: "Explore presets" }}
    />
  );
}
