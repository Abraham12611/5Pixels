import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Brand mark — the spiral-arcs logo. `tone="ink"` is for lime backgrounds
 * (footer, light panels) where the lime mark would be invisible.
 */
export function LogoMark({
  tone = "lime",
  className,
}: {
  tone?: "lime" | "ink";
  className?: string;
}) {
  return (
    <Image
      src={tone === "ink" ? "/brand/logo-mark-ink.png" : "/brand/logo-mark.png"}
      alt=""
      width={512}
      height={512}
      aria-hidden="true"
      className={cn("h-7 w-7", className)}
    />
  );
}
