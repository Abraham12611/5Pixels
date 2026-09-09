"use client";

import { useState } from "react";
import { EditProfileDialog } from "./edit-profile-dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PencilSimple, MapPin, Heart, Lightning, ImageSquare } from "@phosphor-icons/react";
import type { PublicProfile } from "@/lib/profile/actions";

interface PublicProfileCardProps {
  profile: PublicProfile;
  avatarUrl: string | null;
  stats: {
    generations: number;
    favorites: number;
    spent: number | null;
    joined: string;
  };
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function PublicProfileCard({
  profile,
  avatarUrl,
  stats,
}: PublicProfileCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6 text-center">
      <Avatar className="mx-auto h-28 w-28 border-2 border-lime-400/40">
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt={profile.display_name ?? "Profile"} />
        ) : null}
        <AvatarFallback className="bg-charcoal-800 text-cream-50 text-2xl font-semibold">
          {initials(profile.display_name ?? "You")}
        </AvatarFallback>
      </Avatar>

      <h1 className="text-cream-50 mt-4 text-xl font-bold">
        {profile.display_name ?? "You"}
      </h1>

      {profile.username ? (
        <p className="text-lime-400 mt-1 font-medium">@{profile.username}</p>
      ) : null}

      {profile.headline ? (
        <p className="text-text-secondary mt-2 text-sm">{profile.headline}</p>
      ) : null}

      {profile.bio ? (
        <p className="text-text-muted mt-3 line-clamp-4 text-sm leading-relaxed">
          {profile.bio}
        </p>
      ) : null}

      {profile.location ? (
        <p className="text-text-muted mt-3 inline-flex items-center justify-center gap-1 text-xs">
          <MapPin size={12} />
          {profile.location}
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-3 gap-2">
        <div className="bg-charcoal-800 rounded-xl p-3">
          <p className="text-cream-50 text-lg font-bold">{stats.generations}</p>
          <p className="text-text-muted text-[10px] uppercase tracking-wide">Generations</p>
        </div>
        <div className="bg-charcoal-800 rounded-xl p-3">
          <p className="text-cream-50 text-lg font-bold">{stats.favorites}</p>
          <p className="text-text-muted text-[10px] uppercase tracking-wide">Favorites</p>
        </div>
        <div className="bg-charcoal-800 rounded-xl p-3">
          <p className="text-cream-50 text-lg font-bold">
            {stats.spent !== null ? stats.spent : "—"}
          </p>
          <p className="text-text-muted text-[10px] uppercase tracking-wide">Spent</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <Button
          onClick={() => setOpen(true)}
          variant="secondary"
          className="w-full"
        >
          <PencilSimple size={16} weight="bold" className="mr-2" />
          Edit profile
        </Button>

        <div className="flex items-center justify-center gap-4 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1">
            <ImageSquare size={13} />
            {stats.generations} works
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart size={13} weight="fill" className="text-rose-400" />
            {stats.favorites} saves
          </span>
          {stats.spent !== null ? (
            <span className="inline-flex items-center gap-1">
              <Lightning size={13} weight="fill" className="text-lime-400" />
              {stats.spent} cr spent
            </span>
          ) : null}
        </div>

        <p className="text-text-muted text-xs">Joined {stats.joined}</p>
      </div>

      <EditProfileDialog
        profile={profile}
        avatarUrl={avatarUrl}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
