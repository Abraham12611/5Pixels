import { redirect } from "next/navigation";

/**
 * Generation history is the Runs segment inside Library (`11 §3`). The URL
 * stays valid via redirect so existing bookmarks and links keep working.
 */
export default function GenerationsHistoryPage() {
  redirect("/app/library?tab=runs");
}
