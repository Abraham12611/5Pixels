import { AppHeader } from "@/components/consumer/app-header";
import { MobileNavShell } from "@/components/consumer/mobile-bottom-nav";
import { DegradedBanner } from "@/components/consumer/degraded-banner";
import {
  DegradedBannerGate,
  OfflineBanner,
} from "@/components/consumer/offline-banner";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-ink-950 flex min-h-screen flex-col">
      <AppHeader />
      <OfflineBanner />
      <DegradedBannerGate>
        <DegradedBanner />
      </DegradedBannerGate>
      <MobileNavShell>{children}</MobileNavShell>
    </div>
  );
}
