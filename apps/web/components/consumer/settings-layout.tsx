import { SettingsNav } from "@/components/consumer/settings-nav";

interface SettingsLayoutProps {
  active: string;
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}

export function SettingsLayout({
  active,
  userName,
  userEmail,
  children,
}: SettingsLayoutProps) {
  return (
    <div className="grid gap-6 md:grid-cols-[280px_1fr]">
      <SettingsNav active={active} userName={userName} userEmail={userEmail} />
      <main className="min-w-0">{children}</main>
    </div>
  );
}
