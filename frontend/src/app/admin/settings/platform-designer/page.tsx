import { redirect } from "next/navigation";

/** Legacy URL — AI Designer now uses the onboarding wizard */
export default function PlatformDesignerRedirectPage() {
  redirect("/admin/onboarding");
}
