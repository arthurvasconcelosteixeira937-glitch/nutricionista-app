"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Home, Settings, Users } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/inicio", label: "Inicio", icon: Home, match: ["/inicio", "/trabajos", "/cobrar"] },
  { href: "/clientes", label: "Clientes", icon: Users, match: ["/clientes"] },
  { href: "/historial", label: "Historial", icon: History, match: ["/historial"] },
  { href: "/ajustes", label: "Ajustes", icon: Settings, match: ["/ajustes"] },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      aria-label="Menú principal"
    >
      <ul className="mx-auto grid h-[68px] max-w-lg grid-cols-4">
        {TABS.map((t) => {
          const active = t.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[12.5px] font-semibold transition",
                  active ? "text-brand" : "text-ink-muted"
                )}
              >
                <span className={cn("flex h-8 w-14 items-center justify-center rounded-full transition", active && "bg-brand-light")}>
                  <t.icon className="h-6 w-6" strokeWidth={active ? 2.4 : 2} />
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
