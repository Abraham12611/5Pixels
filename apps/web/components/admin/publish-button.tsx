"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PublishButton({
  productId,
  versionId,
  action,
}: {
  productId: string;
  versionId?: string;
  action: (productId: string, versionId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!versionId) return null;

  return (
    <Button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await action(productId, versionId);
          router.refresh();
        })
      }
    >
      {isPending ? "Publishing..." : "Publish version"}
    </Button>
  );
}
