import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { SiteFooter } from "@/components/SiteFooter";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4">
          <Link href="/" aria-label="Cóbralo, inicio">
            <Logo />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <article className="space-y-4 text-[16px] leading-relaxed text-ink-soft [&_h1]:text-3xl [&_h1]:font-extrabold [&_h1]:text-ink [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
          {children}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
