"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, Pencil } from "@phosphor-icons/react";
import Link from "next/link";

interface ProfileCardProps {
  name: string;
  email: string;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProfileCard({ name, email }: ProfileCardProps) {
  return (
    <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="border-cream-100/10 h-14 w-14 border">
            <AvatarFallback className="bg-charcoal-700 text-cream-50 text-lg font-bold">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-cream-100 text-xl font-semibold">{name}</h2>
            <p className="text-text-secondary mt-0.5 text-sm">{email}</p>
          </div>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href="/app/settings?section=profile" className="text-text-secondary hover:text-cream-100">
            <Pencil size={16} weight="bold" />
          </Link>
        </Button>
      </div>

      <div className="border-t-cream-100/10 mt-6 border-t pt-6">
        <h3 className="text-cream-100 text-sm font-semibold">About you</h3>
        <p className="text-text-secondary mt-2 text-sm">
          Your profile helps us personalize your experience.
        </p>
        <div className="mt-4 flex items-center gap-2 text-text-muted">
          <User size={16} weight="bold" />
          <span className="text-sm">Private account</span>
        </div>
      </div>
    </section>
  );
}
