import Link from "next/link";
import { Logo } from "./ui";

export function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/">
        <Logo />
      </Link>
      <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
        <b>Borrador:</b> este documento es un borrador y debe ser revisado por un abogado en México antes de usarse
        públicamente.
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">Última actualización: {updated}</p>
      <article className="mt-6 space-y-4 text-slate-700 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </article>
    </main>
  );
}
