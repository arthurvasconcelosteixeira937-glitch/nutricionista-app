"use client";

import { useMemo, useState } from "react";
import { Badge, Input, Select } from "@/components/ui";

export interface PickerClient {
  id: string;
  name: string;
  service: string | null;
  daysOverdue: number;
  daysSince: number;
  eligible: boolean;
  reason: string | null;
  isDemo: boolean;
}

export function ClientPicker({ clients, preselected }: { clients: PickerClient[]; preselected: string[] }) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(preselected.filter((id) => clients.some((c) => c.id === id && c.eligible))),
  );
  const [q, setQ] = useState("");
  const [service, setService] = useState("");
  const services = useMemo(() => [...new Set(clients.map((c) => c.service).filter(Boolean))] as string[], [clients]);
  const visible = clients.filter(
    (c) => (!q || c.name.toLowerCase().includes(q.toLowerCase())) && (!service || c.service === service),
  );
  const visibleEligible = visible.filter((c) => c.eligible);

  function toggle(id: string, on: boolean) {
    setSelected((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  return (
    <div>
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="clientIds" value={id} />
      ))}
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-5 py-3">
        <div className="min-w-40 flex-1">
          <label htmlFor="pk-q" className="mb-1 block text-xs font-medium text-slate-600">
            Buscar
          </label>
          <Input id="pk-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome da cliente" />
        </div>
        <div>
          <label htmlFor="pk-s" className="mb-1 block text-xs font-medium text-slate-600">
            Serviço da última visita
          </label>
          <Select id="pk-s" value={service} onChange={(e) => setService(e.target.value)}>
            <option value="">Todos</option>
            {services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <button
          type="button"
          className="h-10 text-sm font-medium text-brand-700 hover:underline"
          onClick={() => setSelected((s) => new Set([...s, ...visibleEligible.map((c) => c.id)]))}
        >
          Selecionar visíveis ({visibleEligible.length})
        </button>
        <button type="button" className="h-10 text-sm text-slate-600 hover:underline" onClick={() => setSelected(new Set())}>
          Limpar seleção
        </button>
      </div>
      <p className="px-5 py-2 text-sm font-medium text-slate-800" aria-live="polite">
        {selected.size} cliente(s) selecionada(s)
      </p>
      <ul className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto border-t border-slate-100">
        {visible.length === 0 && <li className="px-5 py-6 text-center text-sm text-slate-500">Nenhuma cliente encontrada.</li>}
        {visible.map((c) => (
          <li key={c.id} className={c.eligible ? "" : "bg-slate-50"}>
            <label className={`flex items-start gap-3 px-5 py-3 text-sm ${c.eligible ? "cursor-pointer" : "cursor-not-allowed"}`}>
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-brand-700"
                checked={selected.has(c.id)}
                disabled={!c.eligible}
                onChange={(e) => toggle(c.id, e.target.checked)}
              />
              <span className="min-w-0 flex-1">
                <span className="font-medium text-slate-900">{c.name}</span>
                {c.isDemo && (
                  <span className="ml-2">
                    <Badge tone="demo">Fictícia</Badge>
                  </span>
                )}
                <span className="block text-xs text-slate-600">
                  {c.service ?? "Serviço não informado"} · {c.daysSince} dias sem visita ({c.daysOverdue} além do prazo)
                </span>
                {!c.eligible && <span className="block text-xs text-amber-800">{c.reason}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
