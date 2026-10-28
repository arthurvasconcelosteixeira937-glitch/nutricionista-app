import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/session";
import { getAiStatus } from "@/lib/ai";
import { logoutAction } from "../(auth)/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <AppShell
      tenantName={session.tenantName}
      userName={session.userName}
      role={session.role}
      isDemo={session.tenantIsDemo}
      aiLabel={getAiStatus().label}
      logout={logoutAction}
    >
      {children}
    </AppShell>
  );
}
