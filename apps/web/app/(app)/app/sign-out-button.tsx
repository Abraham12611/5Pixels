"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";

export function SignOutButton() {
  return (
    <form action={signOut} className="mt-6">
      <Button type="submit" variant="secondary">
        Sign out
      </Button>
    </form>
  );
}
