"use client";

import { useState } from "react";
import Link from "next/link";
import { updateUserSettings } from "@/lib/db/settings";
import type { UserSettings } from "@/lib/db/settings";

interface SettingsFormProps {
  initial: UserSettings;
}

export default function SettingsForm({ initial }: SettingsFormProps) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const result = await updateUserSettings({
      defaultDownloadFormat: settings.defaultDownloadFormat,
      marketingOptIn: settings.marketingOptIn,
      productUpdatesOptIn: settings.productUpdatesOptIn,
      autoDeleteOriginalsDays: settings.autoDeleteOriginalsDays,
      autoDeleteOutputsDays: settings.autoDeleteOutputsDays,
    });

    if (result.success) {
      setMessage("Settings saved.");
    } else {
      setMessage(result.error ?? "Unable to save settings.");
    }

    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
        <h2 className="text-cream-100 text-lg font-semibold">Preferences</h2>

        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="download-format"
              className="text-text-muted block text-xs font-medium uppercase"
            >
              Default download format
            </label>
            <select
              id="download-format"
              value={settings.defaultDownloadFormat}
              onChange={(e) =>
                setSettings({ ...settings, defaultDownloadFormat: e.target.value })
              }
              className="border-cream-100/10 bg-charcoal-900 text-cream-50 mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            >
              <option value="webp">WebP</option>
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
            </select>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.marketingOptIn}
              onChange={(e) =>
                setSettings({ ...settings, marketingOptIn: e.target.checked })
              }
              className="h-5 w-5 rounded text-lime-500"
            />
            <span className="text-cream-100 text-sm">Send marketing emails</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.productUpdatesOptIn}
              onChange={(e) =>
                setSettings({ ...settings, productUpdatesOptIn: e.target.checked })
              }
              className="h-5 w-5 rounded text-lime-500"
            />
            <span className="text-cream-100 text-sm">Send product updates</span>
          </label>
        </div>
      </section>

      <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
        <h2 className="text-cream-100 text-lg font-semibold">
          Data retention
        </h2>
        <p className="text-text-secondary mt-1 text-sm">
          Automatically delete source images and generated outputs after a
          number of days. Leave blank to keep forever.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="originals-retention"
              className="text-text-muted block text-xs font-medium uppercase"
            >
              Delete source images after (days)
            </label>
            <input
              id="originals-retention"
              type="number"
              min={1}
              value={settings.autoDeleteOriginalsDays ?? ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  autoDeleteOriginalsDays:
                    e.target.value === ""
                      ? null
                      : Math.max(1, Number(e.target.value)),
                })
              }
              className="border-cream-100/10 bg-charcoal-900 text-cream-50 mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="outputs-retention"
              className="text-text-muted block text-xs font-medium uppercase"
            >
              Delete outputs after (days)
            </label>
            <input
              id="outputs-retention"
              type="number"
              min={1}
              value={settings.autoDeleteOutputsDays ?? ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  autoDeleteOutputsDays:
                    e.target.value === ""
                      ? null
                      : Math.max(1, Number(e.target.value)),
                })
              }
              className="border-cream-100/10 bg-charcoal-900 text-cream-50 mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      <button
        type="submit"
        disabled={saving}
        className="bg-lime-400 text-charcoal-950 hover:bg-lime-300 disabled:opacity-50 rounded-xl px-4 py-2 text-sm font-semibold transition"
      >
        {saving ? "Saving…" : "Save settings"}
      </button>

      {message && (
        <p
          className={`text-sm ${
            message === "Settings saved." ? "text-lime-400" : "text-rose-400"
          }`}
        >
          {message}
        </p>
      )}

      <div className="border-t-cream-100/10 pt-8">
        <Link
          href="/app/settings/delete"
          className="text-rose-400 hover:text-rose-300 text-sm font-medium transition"
        >
          Delete account →
        </Link>
      </div>
    </form>
  );
}
