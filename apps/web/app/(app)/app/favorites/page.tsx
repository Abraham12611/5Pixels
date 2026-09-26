import { redirect } from "next/navigation";

/**
 * Favorites lives on as the Presets segment inside Library (`11 §3`). The URL
 * stays valid via redirect so existing bookmarks and links keep working.
 */
export default function FavoritesPage() {
  redirect("/app/library?tab=presets");
}
