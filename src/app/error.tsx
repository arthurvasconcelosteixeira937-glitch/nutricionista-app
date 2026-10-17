"use client";
import { Logo, buttonClass } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
      <Logo />
      <h1 className="mt-8 text-2xl font-bold">Algo salió mal</h1>
      <p className="mt-2 text-slate-600">Intenta de nuevo en unos segundos.</p>
      <button onClick={reset} className={buttonClass("primary", "mt-6")}>
        Reintentar
      </button>
    </main>
  );
}
