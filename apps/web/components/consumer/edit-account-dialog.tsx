"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile, type PublicProfile } from "@/lib/profile/actions";
import { AvatarUploader } from "./avatar-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "@phosphor-icons/react";

interface EditAccountDialogProps {
  profile: Pick<PublicProfile, "display_name" | "avatar_asset_id">;
  avatarUrl: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Button + dialog pair — the dialog must mount from a client boundary. */
export function EditAccountButton({
  profile,
  avatarUrl,
  label = "Edit profile",
}: {
  profile: Pick<PublicProfile, "display_name" | "avatar_asset_id">;
  avatarUrl: string | null;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <EditAccountDialog
        profile={profile}
        avatarUrl={avatarUrl}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

/**
 * Quick-edit modal for the Account surface — avatar + display name only.
 * Sticky header/footer per AC-07; the Profile page stays canonical.
 */
export function EditAccountDialog({
  profile,
  avatarUrl,
  open,
  onOpenChange,
}: EditAccountDialogProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [avatarAssetId, setAvatarAssetId] = useState<string | null>(
    profile.avatar_asset_id
  );
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(
    avatarUrl
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await updateProfile({
      display_name: displayName.trim() || undefined,
      avatar_asset_id: avatarAssetId,
    });
    setSaving(false);
    if (result.success) {
      onOpenChange(false);
      router.refresh();
    } else {
      setError(result.error ?? "Unable to save profile.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-md flex-col gap-0 overflow-hidden p-0">
        <div className="border-cream-100/10 flex items-center justify-between border-b px-6 py-4">
          <DialogTitle className="text-base font-semibold">
            Edit profile
          </DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-text-secondary hover:text-cream-50 rounded-lg p-1 transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form
          id="edit-account-form"
          onSubmit={handleSubmit}
          className="flex-1 space-y-6 overflow-y-auto px-6 py-6"
        >
          <div className="flex justify-center">
            <AvatarUploader
              currentUrl={avatarPreviewUrl}
              onChange={(assetId, url) => {
                setAvatarAssetId(assetId);
                setAvatarPreviewUrl(url);
              }}
              onError={setError}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-display-name">Display name</Label>
            <Input
              id="edit-display-name"
              name="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              maxLength={60}
            />
          </div>

          {error && (
            <div className="border-error/40 bg-error/10 text-error rounded-xl border p-3 text-sm">
              {error}
            </div>
          )}
        </form>

        <div className="border-cream-100/10 flex items-center justify-end gap-3 border-t px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="edit-account-form" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
