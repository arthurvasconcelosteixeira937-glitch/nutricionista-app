import { BottomNav } from "@/components/BottomNav";
import { TimezoneSync } from "@/components/TimezoneSync";
import { TrialBanner } from "@/components/TrialBanner";
import { requireAppProfile } from "@/lib/data";
import { isSubscribed, trialDaysLeft } from "@/lib/subscription";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAppProfile();
  const daysLeft = isSubscribed(profile) ? null : trialDaysLeft(profile);

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="pb-nav mx-auto max-w-lg px-4">
        {daysLeft !== null && daysLeft <= 2 && <TrialBanner days={daysLeft} />}
        {children}
      </div>
      <BottomNav />
      <TimezoneSync userId={profile.id} timezone={profile.timezone} />
    </div>
  );
}
