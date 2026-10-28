import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/data";
import { Onboarding } from "./Onboarding";

export const metadata: Metadata = { title: "Bienvenida" };

export default async function WelcomePage() {
  const profile = await requireProfile();
  if (profile.onboarded) redirect("/inicio");
  return <Onboarding profile={profile} />;
}
