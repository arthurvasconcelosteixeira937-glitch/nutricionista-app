import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col bg-brand-50">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
        <Link href="/" className="mx-auto mb-8" aria-label="Cóbralo, inicio">
          <Logo />
        </Link>
        <div className="rounded-3xl bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-[16px] text-ink-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-[16px] text-ink-soft">{footer}</div>}
      </div>
    </main>
  );
}
