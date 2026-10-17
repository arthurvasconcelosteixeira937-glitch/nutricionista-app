import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/actions/auth";
import { Logo } from "@/components/ui";
import { getSellerContext, isAdminEmail } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSellerContext();
  if (!ctx.profile.onboarding_completed) redirect("/onboarding");

  const { access } = ctx;
  return (
    <div className="min-h-dvh pb-24 sm:pb-8">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/panel">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 text-sm font-medium sm:flex">
            <Link href="/panel" className="rounded-lg px-3 py-2 hover:bg-slate-100">
              Cobros
            </Link>
            <Link href="/panel/ajustes" className="rounded-lg px-3 py-2 hover:bg-slate-100">
              Ajustes
            </Link>
            {isAdminEmail(ctx.user.email) ? (
              <Link href="/admin" className="rounded-lg px-3 py-2 hover:bg-slate-100">
                Admin
              </Link>
            ) : null}
            <form action={signOutAction}>
              <button className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100">Salir</button>
            </form>
          </nav>
        </div>
      </header>

      {access.state !== "active" ? (
        <div className={access.canCreateCobros ? "bg-brand-50" : "bg-amber-50"}>
          <div className="mx-auto max-w-3xl px-4 py-2 text-sm">
            <span className={access.canCreateCobros ? "text-brand-900" : "text-amber-900"}>{access.message} </span>
            <Link href="/panel/ajustes#suscripcion" className="font-semibold underline">
              Ver plan
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>

      {/* Navegação inferior no celular */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 text-xs font-medium text-slate-600">
          <Link href="/panel" className="flex flex-col items-center gap-1 py-3">
            <span className="text-lg">📋</span>Cobros
          </Link>
          <Link href="/panel/cobros/nuevo" className="flex flex-col items-center gap-1 py-3 text-brand-700">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-lg text-white">+</span>
            Nuevo
          </Link>
          <Link href="/panel/ajustes" className="flex flex-col items-center gap-1 py-3">
            <span className="text-lg">⚙️</span>Ajustes
          </Link>
        </div>
      </nav>
    </div>
  );
}
