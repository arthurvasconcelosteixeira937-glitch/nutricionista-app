"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, UserPlus, Users } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { formatMoney, formatPhone, initials } from "@/lib/format";
import type { Client } from "@/lib/types";

export interface ClientListItem extends Client {
  owed: number;
  late: boolean;
}

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function ClientList({ clients }: { clients: ClientListItem[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = normalize(q.trim());
    if (!term) return clients;
    return clients.filter((c) => normalize(c.name).includes(term));
  }, [q, clients]);

  if (clients.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-8 w-8" />}
        title="Aún no tienes clientes."
        text="Agrega a tu primer cliente para empezar a cobrarle."
        action={
          <LinkButton href="/clientes/nuevo" full icon={<UserPlus className="h-5 w-5" />}>
            Agregar cliente
          </LinkButton>
        }
      />
    );
  }

  return (
    <>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre"
          aria-label="Buscar cliente por nombre"
          className="block min-h-[52px] w-full rounded-xl border-2 border-gray-200 bg-white pl-12 pr-4 text-[17px] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="py-10 text-center text-ink-muted">No encontramos a “{q}”.</p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link href={`/clientes/${c.id}`} className="flex min-h-[72px] items-center gap-3 px-4 py-3 active:bg-gray-50">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-light text-[15px] font-bold text-brand">
                  {initials(c.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] font-semibold text-ink">{c.name}</span>
                  <span className="block truncate text-sm text-ink-muted">{formatPhone(c.phone)}</span>
                </span>
                {c.owed > 0 && (
                  <span className={cn("tabular text-[16px] font-bold", c.late ? "text-alert" : "text-ink")}>{formatMoney(c.owed)}</span>
                )}
                <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
