import { useState } from 'react';

// Gráficos leves em SVG/HTML, série única (cor única = sem legenda; o título
// nomeia a série). Barras finas com topo arredondado, grade recessiva e
// tooltip ao passar o mouse/tocar. Os números exatos também aparecem em tabelas.

const SERIES = '#e9c46a';

export function BarChart({ data, format = (v: number) => String(v), height = 180, label }: {
  data: { label: string; value: number }[]; format?: (v: number) => string; height?: number; label: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = [0, 0.5, 1].map((k) => max * k);
  return (
    <figure aria-label={label} className="relative">
      <div className="relative flex gap-2" style={{ height }}>
        <div className="flex w-14 shrink-0 flex-col justify-between py-0 text-right text-[10px] text-zinc-500">
          {[...ticks].reverse().map((t, i) => <span key={i} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">{format(t)}</span>)}
        </div>
        <div className="relative flex-1">
          {ticks.map((_, i) => <div key={i} className="absolute inset-x-0 border-t border-white/[0.06]" style={{ top: `${(i / (ticks.length - 1)) * 100}%` }} />)}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((d, i) => (
              <div
                key={d.label}
                className="relative flex h-full flex-1 cursor-default items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onTouchStart={() => setHover(i)}
              >
                <div
                  className="w-full max-w-[28px] rounded-t-[4px] transition-opacity"
                  style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 2 : 0, background: SERIES, opacity: hover === null || hover === i ? 1 : 0.45 }}
                />
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg border border-white/10 bg-ink-850 px-2.5 py-1.5 text-xs shadow-xl">
                    <p className="text-zinc-400">{d.label}</p>
                    <p className="font-semibold text-white">{format(d.value)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-16 mt-1.5 flex gap-[2px] text-[10px] text-zinc-500">
        {data.map((d, i) => <span key={d.label} className="flex-1 truncate text-center">{data.length > 10 && i % 2 ? '' : d.label}</span>)}
      </div>
    </figure>
  );
}

/** Funil horizontal (etapas de conversão). */
export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div className="space-y-2.5">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].value : null;
        const rate = prev ? (s.value / Math.max(1, prev)) * 100 : null;
        return (
          <div key={s.label} title={`${s.label}: ${s.value}`}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-zinc-300">{s.label}</span>
              <span className="text-zinc-400">
                <b className="text-white">{s.value.toLocaleString('pt-BR')}</b>
                {rate !== null && <span className="ml-2 text-zinc-500">{rate.toFixed(0)}% da etapa anterior</span>}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-white/[0.05]">
              <div className="h-full rounded-full" style={{ width: `${(s.value / max) * 100}%`, minWidth: s.value ? 4 : 0, background: SERIES }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Agrupa datas ISO por dia (dd/mm) nos últimos N dias. */
export function byDay<T>(items: T[], getDate: (t: T) => string, getValue: (t: T) => number, days = 7) {
  const out: { label: string; value: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const v = items.filter((it) => {
      const t = new Date(getDate(it));
      return t >= d && t < next;
    }).reduce((a, it) => a + getValue(it), 0);
    out.push({ label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), value: v });
  }
  return out;
}
