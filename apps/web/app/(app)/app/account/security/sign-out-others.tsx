"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { signOutOtherSessions } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function SignOutOthersButton() {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const handleClick = () => {
    startTransition(async () => {
      const result = await signOutOtherSessions();
      if (result.success) {
        setDone(true);
        toast.success("Signed out everywhere else");
      } else {
        toast.error(result.error ?? "Unable to sign out other sessions");
      }
    });
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleClick}
      disabled={pending || done}
    >
      {done
        ? "Signed out"
        : pending
          ? "Signing out…"
          : "Sign out other sessions"}
    </Button>
  );
}
