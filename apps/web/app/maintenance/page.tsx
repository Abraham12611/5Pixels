import { EdgePage } from "@/components/edge/edge-page";

export const dynamic = "force-dynamic";

export default function MaintenancePage() {
  return (
    <EdgePage
      title="5Pixels is down for maintenance"
      description="We're doing a quick tune-up. Nothing you've made is affected — try again in a little while."
      primaryAction={{ href: "/", label: "Try again" }}
    />
  );
}
