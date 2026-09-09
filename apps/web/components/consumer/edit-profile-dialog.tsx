"use client";

import { useState } from "react";
import { updateProfile, type PublicProfile } from "@/lib/profile/actions";
import { AvatarUploader } from "./avatar-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, FloppyDisk } from "@phosphor-icons/react";

interface EditProfileDialogProps {
  profile: PublicProfile;
  avatarUrl: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function EditProfileDialog({
  profile,
  avatarUrl,
  open,
  onOpenChange,
  onSaved,
}: EditProfileDialogProps) {
  const [form, setForm] = useState({
    display_name: profile.display_name ?? "",
    username: profile.username ?? "",
    headline: profile.headline ?? "",
    bio: profile.bio ?? "",
    location: profile.location ?? "",
    show_spent_credits: profile.show_spent_credits,
  });
  const [avatarAssetId, setAvatarAssetId] = useState<string | null>(
    profile.avatar_asset_id
  );
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(
    avatarUrl
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (assetId: string, url: string) => {
    setAvatarAssetId(assetId);
    setAvatarPreviewUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const result = await updateProfile({
      ...form,
      avatar_asset_id: avatarAssetId,
    });

    setSaving(false);
    if (result.success) {
      onOpenChange(false);
      onSaved?.();
    } else {
      setError(result.error ?? "Unable to save profile.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle>Edit profile</DialogTitle>
              <DialogDescription>
                Update your public profile details.
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-text-secondary hover:text-cream-50 rounded-lg p-1 transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex justify-center">
            <AvatarUploader
              currentUrl={avatarPreviewUrl}
              onChange={handleAvatarChange}
              onError={setError}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="display_name">Display name</Label>
              <Input
                id="display_name"
                name="display_name"
                value={form.display_name}
                onChange={handleChange}
                placeholder="Your name"
                maxLength={60}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <span className="text-text-muted absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                  @
                </span>
                <Input
                  id="username"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="handle"
                  maxLength={32}
                  className="pl-7"
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                name="headline"
                value={form.headline}
                onChange={handleChange}
                placeholder="e.g. Portrait photographer & preset explorer"
                maxLength={120}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                value={form.bio}
                onChange={handleChange}
                placeholder="A short bio..."
                maxLength={300}
                rows={3}
              />
              <p className="text-text-muted text-right text-xs">
                {form.bio.length}/300
              </p>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="City, country"
                maxLength={80}
              />
            </div>
          </div>

          <div className="border-cream-100/10 flex items-center justify-between rounded-xl border p-4">
            <div>
              <p className="text-cream-50 text-sm font-medium">
                Show spent credits
              </p>
              <p className="text-text-muted text-xs">
                Display your total credits spent on your profile.
              </p>
            </div>
            <Switch
              checked={form.show_spent_credits}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, show_spent_credits: checked }))
              }
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-lime-500 text-ink-950 hover:bg-lime-400"
            >
              <FloppyDisk size={16} weight="fill" className="mr-1.5" />
              {saving ? "Saving..." : "Save profile"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
