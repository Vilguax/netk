import { redirect } from "next/navigation";

// Redirect root to the-forge by default
export default function FlipperHome() {
  redirect("/the-forge");
}
