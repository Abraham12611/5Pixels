"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DuplicateButton({
  productId,
  action,
  listHref,
}: {
  productId: string;
  action: (id: string) => Promise<unknown>;
  listHref: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await action(productId);
          router.refresh();
          router.push(listHref);
        })
      }
    >
      {isPending ? "Duplicating..." : "Duplicate"}
    </Button>
  );
}
