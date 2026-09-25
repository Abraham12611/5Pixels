"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type CampaignStatus = "draft" | "scheduled" | "live" | "paused" | "archived";

interface Props {
  campaignId: string;
  status: CampaignStatus;
  action: (campaignId: string, status: string) => Promise<void>;
}

const ACTIONS: Record<
  CampaignStatus,
  { label: string; next: CampaignStatus; variant: "secondary" | "brand" } | null
> = {
  draft: { label: "Go live", next: "live", variant: "brand" },
  scheduled: { label: "Go live", next: "live", variant: "brand" },
  live: { label: "Pause", next: "paused", variant: "secondary" },
  paused: { label: "Resume", next: "live", variant: "brand" },
  archived: null,
};

/** The "can I switch it off" control — pause/resume/archive per campaign. */
export function CampaignStatusActions({ campaignId, status, action }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const run = (next: CampaignStatus) =>
    startTransition(async () => {
      try {
        await action(campaignId, next);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      }
    });

  const primary = ACTIONS[status];
  const canArchive = status === "live" || status === "paused";

  return (
    <div className="flex items-center gap-2">
      {primary && (
        <Button
          type="button"
          variant={primary.variant}
          size="sm"
          disabled={isPending}
          onClick={() => run(primary.next)}
        >
          {isPending ? "Working…" : primary.label}
        </Button>
      )}
      {canArchive && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => run("archived")}
        >
          Archive
        </Button>
      )}
      {error && <p className="text-error text-xs">{error}</p>}
    </div>
  );
}
