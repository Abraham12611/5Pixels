import { EdgePage } from "@/components/edge/edge-page";

export default function CheckoutCancelPage() {
  return (
    <EdgePage
      title="Checkout cancelled"
      description="No payment was taken. Your plan and credits are unchanged."
      primaryAction={{ href: "/app/billing", label: "Back to billing" }}
      secondaryAction={{ href: "/pricing", label: "Compare plans" }}
    />
  );
}
