import { AppHeader } from "@/components/consumer/app-header";
import { MobileBottomNav } from "@/components/consumer/mobile-bottom-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-ink-950 flex min-h-screen flex-col">
      <AppHeader />
      <div className="flex flex-1 flex-col pb-24 md:pb-0">{children}</div>
      <MobileBottomNav />
    </div>
  );
}
