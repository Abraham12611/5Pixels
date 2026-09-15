import { AppHeader } from "@/components/consumer/app-header";
import { MobileBottomNav } from "@/components/consumer/mobile-bottom-nav";
import { DegradedBanner } from "@/components/consumer/degraded-banner";
import { Toaster } from "@/components/ui/sonner";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-ink-950 flex min-h-screen flex-col">
      <AppHeader />
      <DegradedBanner />
      <div className="flex flex-1 flex-col pb-24 md:pb-0">{children}</div>
      <MobileBottomNav />
      <Toaster
        position="bottom-center"
        mobileOffset={{ bottom: "5.5rem" }}
      />
    </div>
  );
}
