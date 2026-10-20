import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { SUPPORT_URL } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-10 text-center md:flex-row md:justify-between md:text-left">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-ink-muted">© {new Date().getFullYear()} Cóbralo. Hecho para los que trabajan duro.</p>
        </div>
        <nav className="flex flex-wrap justify-center gap-1 text-[15px] font-medium">
          <Link href="/terminos" className="flex min-h-[48px] items-center rounded-xl px-3 text-ink-soft hover:text-brand">
            Términos
          </Link>
          <Link href="/privacidad" className="flex min-h-[48px] items-center rounded-xl px-3 text-ink-soft hover:text-brand">
            Privacidad
          </Link>
          <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="flex min-h-[48px] items-center rounded-xl px-3 text-ink-soft hover:text-brand">
            Soporte
          </a>
        </nav>
      </div>
    </footer>
  );
}
