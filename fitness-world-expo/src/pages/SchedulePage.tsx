import { Link } from 'react-router-dom';
import { CalendarDays, Clock, Sparkles } from 'lucide-react';
import { useExpo } from '@/data/store';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { Badge } from '@/components/ui';
import { activeSeason, nextSeason, phaseLabel, seasonDays, seasonStatus, isWithinShift } from '@/services/season';
import { addDays, fmtDate, fmtTime, parseYmd, ymd } from '@/lib/util';

const TYPE: Record<string, { label: string; tone: 'gold' | 'green' | 'zinc' | 'blue' | 'violet' }> = {
  lancamento: { label: 'Lançamento', tone: 'gold' },
  promocao: { label: 'Promoção', tone: 'green' },
  palestra: { label: 'Palestra', tone: 'blue' },
  especial: { label: 'Especial', tone: 'violet' },
  competicao: { label: 'Competição', tone: 'zinc' },
};

export default function SchedulePage() {
  const st = useExpo();
  const season = activeSeason(st)!;
  const status = seasonStatus(season);
  const next = nextSeason(st);
  const days = seasonDays(season);
  const now = Date.now();
  const sponsors = st.sponsors.filter((s) => s.seasonId === season.id && s.contractStatus === 'assinado');
  const launches = st.products.filter((p) => p.isLaunch && st.brands.some((b) => b.id === p.brandId && b.status === 'aprovada' && b.slotId));
  const sellersNow = st.sellers.filter((s) => s.active && isWithinShift(s.shifts, status.day));
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="eyebrow">Temporadas e programação</p>
        <h1 className="mt-2 font-display text-5xl font-bold uppercase">{season.name}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
          <Badge tone={status.phase === 'aberta' ? 'green' : 'zinc'}>{phaseLabel[status.phase]}</Badge>
          <span className="flex items-center gap-1.5"><CalendarDays size={15} /> {fmtDate(season.startDate)} – {fmtDate(season.endDate)} ({days} dias)</span>
          <span className="flex items-center gap-1.5"><Clock size={15} /> {season.dailyOpen}–{season.dailyClose}</span>
        </div>
        <p className="mt-3 max-w-2xl text-zinc-400">{season.description}</p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-8">
            {Array.from({ length: days }).map((_, i) => {
              const day = ymd(addDays(parseYmd(season.startDate), i));
              const evs = st.events.filter((e) => e.seasonId === season.id && ymd(new Date(e.start)) === day).sort((a, b) => a.start.localeCompare(b.start));
              return (
                <section key={day}>
                  <div className="mb-3 flex items-baseline gap-3">
                    <h2 className="font-display text-2xl font-bold uppercase">Dia {i + 1}</h2>
                    <span className="text-sm text-zinc-500">{fmtDate(day, { weekday: 'long', day: '2-digit', month: 'long' })}</span>
                    {status.day === i + 1 && <Badge tone="gold">hoje</Badge>}
                  </div>
                  {evs.length === 0 ? <p className="text-sm text-zinc-500">Atendimento nos estandes durante todo o horário da feira.</p> : (
                    <div className="space-y-2">
                      {evs.map((e) => {
                        const live = new Date(e.start).getTime() <= now && new Date(e.end).getTime() >= now;
                        const brand = st.brands.find((b) => b.id === e.brandId);
                        return (
                          <div key={e.id} className={`card flex gap-4 p-4 ${live ? 'border-red-400/40' : ''}`}>
                            <div className="w-16 shrink-0"><p className="font-display text-2xl font-bold">{fmtTime(e.start)}</p><p className="text-xs text-zinc-500">até {fmtTime(e.end)}</p></div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-white">{e.title}</p><Badge tone={TYPE[e.type].tone}>{TYPE[e.type].label}</Badge>{live && <Badge tone="red">AO VIVO</Badge>}</div>
                              <p className="mt-1 text-sm text-zinc-400">{e.description}</p>
                              <p className="mt-1 text-xs text-zinc-500">{e.location}{brand ? ` · ${brand.name}` : ''}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
          <aside className="space-y-4">
            <div className="card p-5">
              <p className="eyebrow">Atendimento agora</p>
              <p className="mt-2 text-sm text-zinc-400">Vendedores com plantão neste horário:</p>
              <div className="mt-3 space-y-2">
                {sellersNow.length === 0 && <p className="text-sm text-zinc-500">Nenhum plantão agendado neste momento.</p>}
                {sellersNow.map((s) => <p key={s.id} className="text-sm"><b>{s.name}</b> <span className="text-zinc-500">· {st.brands.find((b) => b.id === s.brandId)?.name}</span></p>)}
              </div>
              <p className="mt-3 text-[11px] text-zinc-500">Plantão agendado não garante presença: no pavilhão, o status “online” indica que a pessoa está conectada de fato.</p>
            </div>
            <div className="card p-5">
              <p className="eyebrow flex items-center gap-2"><Sparkles size={13} /> Lançamentos</p>
              <div className="mt-3 space-y-2">
                {launches.map((p) => <p key={p.id} className="text-sm"><b>{p.name}</b> <span className="text-zinc-500">· {st.brands.find((b) => b.id === p.brandId)?.name}</span></p>)}
              </div>
            </div>
            <div className="card p-5">
              <p className="eyebrow">Patrocinadores</p>
              <div className="mt-3 flex flex-wrap gap-2">{sponsors.map((s) => <Badge key={s.id} tone={s.tier === 'diamante' ? 'blue' : s.tier === 'ouro' ? 'gold' : 'zinc'}>{s.name}</Badge>)}</div>
            </div>
            {next && (
              <div className="card border-gold-400/30 p-5">
                <p className="eyebrow">Próxima edição</p>
                <p className="mt-2 font-display text-2xl font-bold uppercase">{next.name.replace('FITNESS WORLD EXPO — ', '')}</p>
                <p className="text-sm text-zinc-400">{fmtDate(next.startDate)} – {fmtDate(next.endDate)} · {next.theme}</p>
                <p className="mt-2 text-sm text-zinc-500">{next.description}</p>
                <Link to="/expor" className="btn-ghost mt-4 w-full">Quero expor nesta edição</Link>
              </div>
            )}
            <Link to="/feira" className="btn-gold w-full">Entrar no pavilhão 3D</Link>
          </aside>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
