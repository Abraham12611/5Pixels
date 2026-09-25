"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TeaserFlow } from "./teaser-flow";

/**
 * Mobile launcher for the anon teaser: the sticky CTA mounts the TeaserFlow
 * into a fullscreen overlay on tap instead of keeping it mounted.
 */
export function TeaserLauncher(props: {
  productVersionId: string | null;
  presetName: string;
  heroUrl: string | null;
  creditCost: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button className="shrink-0" onClick={() => setOpen(true)}>
        Try this look
      </Button>
      {open && (
        <div className="bg-ink-950/95 fixed inset-0 z-50 overflow-y-auto p-6 backdrop-blur">
          <TeaserFlow {...props} />
        </div>
      )}
    </>
  );
}
