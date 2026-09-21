import { redirect } from "next/navigation";

export default function SettingsDeleteRedirect() {
  redirect("/app/account/delete");
}
