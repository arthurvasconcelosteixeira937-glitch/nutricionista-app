"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  RotateCcw,
  Settings,
  Users,
  X,
} from "lucide-react";
import { cn } from "./ui";

const NAV = [
  { href: "/painel", label: "Painel", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/reativacao", label: "Reativação", icon: RotateCcw },
  { href: "/campanhas", label: "Campanhas", icon: Megaphone },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppShell({
  children,
  tenantName,
  userName,
  role,
  isDemo,
  aiLabel,
  logout,
}: {
  children: ReactNode;
  tenantName: string;
  userName: string;
  role: "owner" | "staff";
  isDemo: boolean;
  aiLabel: string;
  logout: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav aria-label="Navegação principal" className="flex-1 space-y-1 px-3 py-4">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
              active ? "bg-brand-50 text-brand-800" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-slate-200 p-4 text-sm">
      <p className="font-medium text-slate-900">{userName}</p>
      <p className="text-xs text-slate-500">{role === "owner" ? "Proprietária(o)" : "Equipe"}</p>
      <form action={logout} className="mt-3">
        <button type="submit" className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          <LogOut className="size-4" aria-hidden /> Sair
        </button>
      </form>
    </div>
  );

  const brand = (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="flex size-9 items-center justify-center rounded-lg bg-brand-700 text-sm font-semibold text-white">AR</div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">Assistente de Retorno</p>
        <p className="truncate text-xs text-slate-500">{tenantName}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        {brand}
        {nav}
        {footer}
      </aside>

      {/* Mobile */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-brand-700 text-xs font-semibold text-white">AR</div>
          <span className="truncate text-sm font-semibold">{tenantName}</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
          aria-label="Abrir menu"
          aria-expanded={open}
        >
          <Menu className="size-5" aria-hidden />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Fechar menu">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 lg:px-8">
          {isDemo && (
            <span className="font-medium text-violet-800">
              Conta de demonstração — todos os clientes e resultados são fictícios.
            </span>
          )}
          <span>{aiLabel}</span>
          <span>Envio de mensagens: manual (sem disparo automático)</span>
        </div>
        <main id="conteudo" className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
