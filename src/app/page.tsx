import { redirect } from "next/navigation";

// Send to the gated dashboard. AdminLayout checks the session and bounces to
// the central auth service (:3000) only when not authenticated — so an
// already-logged-in visitor isn't pushed back to the login page.
export default function Home() {
  redirect("/dashboard");
}
