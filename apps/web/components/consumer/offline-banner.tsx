"use client";

import { useEffect, useRef } from "react";
import { WifiSlash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useOnline } from "@/lib/ui/use-online";

/**
 * Persistent thin banner while the browser is offline (16 §6): not
 * dismissible, disappears on reconnect. A "Back online" toast fires only
 * when the user interacted while offline — passive reconnects stay silent.
 */
export function OfflineBanner() {
  const online = useOnline();
  const attemptedRef = useRef(false);

  // Any tap while offline counts as an attempted action — disabled CTAs
  // still receive pointer events.
  useEffect(() => {
    if (online) return;
    const onPointerDown = () => {
      attemptedRef.current = true;
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [online]);

  useEffect(() => {
    if (online && attemptedRef.current) {
      attemptedRef.current = false;
      toast("Back online");
    }
  }, [online]);

  if (online) return null;

  return (
    <div
      role="status"
      className="border-cream-100/10 bg-charcoal-800 border-b"
    >
      <div className="text-text-secondary mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-[13px] sm:px-6">
        <WifiSlash size={14} weight="fill" className="shrink-0 text-lime-400" />
        You&apos;re offline — some things won&apos;t work.
      </div>
    </div>
  );
}

/**
 * Offline wins over the degraded-mode banner (16 §7) — never stack them.
 * Wraps server-rendered degraded content and drops it while offline.
 */
export function DegradedBannerGate({
  children,
}: {
  children: React.ReactNode;
}) {
  return useOnline() ? children : null;
}
