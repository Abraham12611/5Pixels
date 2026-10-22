import type { Metadata } from "next";
import { requireAdmin } from "@/lib/db/admin";
import { PopupTour } from "@/components/admin/popup-tour";

export const metadata: Metadata = {
  title: "Popup inspector — Admin",
};

/**
 * Visual QA surface — mounts every popup/overlay in the app with inert
 * fixtures so the family can be reviewed (and screenshotted) in one pass.
 * Nothing here writes data, records analytics, or reaches checkout.
 */
export default async function PopupsPage() {
  await requireAdmin();
  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] w-full max-w-6xl flex-col px-4 py-6 sm:px-6">
      <PopupTour />
    </div>
  );
}
