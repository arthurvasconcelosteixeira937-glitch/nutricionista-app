import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

export function PageHeader({ title, back, action }: { title: string; back?: string; action?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 -mx-4 mb-4 flex min-h-[60px] items-center gap-2 border-b border-gray-100 bg-white/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
      {back && (
        <Link
          href={back}
          className="-ml-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-ink hover:bg-gray-100"
          aria-label="Volver"
        >
          <ChevronLeft className="h-7 w-7" />
        </Link>
      )}
      <h1 className="flex-1 truncate text-xl font-bold text-ink">{title}</h1>
      {action}
    </header>
  );
}
