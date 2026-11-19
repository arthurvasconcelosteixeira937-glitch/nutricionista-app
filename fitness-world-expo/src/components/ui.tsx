import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { X, FlaskConical, PlugZap, HardDrive } from 'lucide-react';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-gold-300 to-gold-600 font-display text-lg font-extrabold text-ink-950 shadow-[0_0_24px_-6px_rgba(233,196,106,0.7)]">
        FW
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-[19px] font-extrabold tracking-[0.08em] text-white">FITNESS WORLD</span>
          <span className="block text-[10px] font-semibold tracking-[0.42em] text-gold-400">EXPO · VIRTUAL</span>
        </span>
      )}
    </Link>
  );
}

export function Badge({ children, tone = 'zinc' }: { children: ReactNode; tone?: 'zinc' | 'gold' | 'green' | 'red' | 'blue' | 'violet' | 'amber' }) {
  const tones: Record<string, string> = {
    zinc: 'bg-white/[0.06] text-zinc-300 border-white/10',
    gold: 'bg-gold-400/10 text-gold-300 border-gold-400/25',
    green: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/25',
    red: 'bg-red-400/10 text-red-300 border-red-400/25',
    blue: 'bg-sky-400/10 text-sky-300 border-sky-400/25',
    violet: 'bg-violet-400/10 text-violet-300 border-violet-400/25',
    amber: 'bg-amber-400/10 text-amber-300 border-amber-400/25',
  };
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

/** Selo de transparência: deixa claro o que é real, local, simulado ou pendente. */
export function IntegrationTag({ kind }: { kind: 'simulado' | 'local' | 'pendente' }) {
  if (kind === 'simulado')
    return (
      <Badge tone="amber">
        <FlaskConical size={11} /> Simulado
      </Badge>
    );
  if (kind === 'local')
    return (
      <Badge tone="blue">
        <HardDrive size={11} /> Modo local
      </Badge>
    );
  return (
    <Badge tone="red">
      <PlugZap size={11} /> Integração pendente
    </Badge>
  );
}

export function Notice({ tone = 'amber', title, children }: { tone?: 'amber' | 'blue' | 'red'; title: string; children?: ReactNode }) {
  const c = tone === 'amber' ? 'border-amber-400/25 bg-amber-400/[0.06] text-amber-100' : tone === 'blue' ? 'border-sky-400/25 bg-sky-400/[0.06] text-sky-100' : 'border-red-400/25 bg-red-400/[0.06] text-red-100';
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${c}`}>
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 text-[13px] leading-relaxed opacity-80">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: ReactNode; accent?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className={`mt-1.5 font-display text-3xl font-bold tracking-wide ${accent ? 'text-gold-300' : 'text-white'}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-zinc-500">{hint}</span>}
    </label>
  );
}

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={onClose}>
      <div
        className={`fade-up max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-ink-900 shadow-2xl sm:rounded-3xl ${wide ? 'sm:max-w-4xl' : 'sm:max-w-lg'}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-ink-900/95 px-5 py-4 backdrop-blur">
          <div className="font-semibold">{title}</div>
          <button className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center">
      <p className="font-semibold text-zinc-200">{title}</p>
      {children && <div className="mt-1 text-sm text-zinc-500">{children}</div>}
    </div>
  );
}

export function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-850 p-1.5">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer rounded-lg border-0 bg-transparent" />
      <input value={value} onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && onChange(e.target.value)} className="w-full bg-transparent text-sm uppercase text-zinc-200 outline-none" />
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-ink-850 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${value === o.value ? 'bg-gold-400 text-ink-950' : 'text-zinc-400 hover:text-white'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
