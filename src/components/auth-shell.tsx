import Link from "next/link";
import { Logo } from "./ui";

export function AuthShell({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-8">
      <Link href="/" className="mb-10 self-start">
        <Logo />
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-1 text-slate-600">{subtitle}</p> : null}
      <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">{children}</div>
      {footer ? <div className="mt-6 text-center text-sm text-slate-600">{footer}</div> : null}
    </main>
  );
}
