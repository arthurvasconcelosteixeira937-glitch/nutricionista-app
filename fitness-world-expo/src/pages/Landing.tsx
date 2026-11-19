import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock, Headphones, MapPinned, Mic, ShoppingCart, Sparkles, Store, Users } from 'lucide-react';
import { useExpo } from '@/data/store';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { HallMap } from '@/components/HallMap';
import { Badge } from '@/components/ui';
import { activeSeason, nextSeason, phaseLabel, seasonStatus } from '@/services/season';
import { fmtDate, fmtDateTime, money } from '@/lib/util';

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

function Countdown({ to }: { to: Date }) {
  const now = useNow();
  const diff = Math.max(0, to.getTime() - now.getTime());
  const parts = [
    { v: Math.floor(diff / 86400000), l: 'dias' },
    { v: Math.floor((diff / 3600000) % 24), l: 'horas' },
    { v: Math.floor((diff / 60000) % 60), l: 'min' },
    { v: Math.floor((diff / 1000) % 60), l: 'seg' },
  ];
  return (
    <div className="flex gap-2">
      {parts.map((p) => (
        <div key={p.l} className="glass min-w-[64px] rounded-xl px-3 py-2 text-center">
          <div className="font-display text-3xl font-bold text-white">{String(p.v).padStart(2, '0')}</div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-400">{p.l}</div>
        </div>
      ))}
    </div>
  );
}

export default function Landing() {
  const st = useExpo();
  const season = activeSeason(st)!;
  const now = useNow(30000);
  const status = seasonStatus(season, now);
  const next = nextSeason(st, now);
  const exhibitors = st.brands.filter((b) => b.status === 'aprovada' && b.slotId);
  const sellers = st.sellers.filter((s) => s.active && exhibitors.some((b) => b.id === s.brandId));
  const products = st.products.filter((p) => exhibitors.some((b) => b.id === p.brandId));
  const events = useMemo(
    () => st.events.filter((e) => e.seasonId === season.id && new Date(e.end) > now).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 4),
    [st.events, season.id, now],
  );
  const sponsors = st.sponsors.filter((s) => s.seasonId === season.id && s.contractStatus !== 'cancelado');

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="grid-bg absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gold-500/10 blur-3xl" />
          <div className="absolute -left-20 top-40 h-80 w-80 rounded-full bg-volt-500/10 blur-3xl" />
          {[12, 32, 68, 88].map((x, i) => (
            <div
              key={x}
              className="absolute -top-10 h-[620px] w-28 origin-top bg-gradient-to-b from-white/20 via-white/[0.04] to-transparent blur-md"
              style={{ left: `${x}%`, animation: `beam ${7 + i}s ease-in-out ${i * 0.8}s infinite` }}
            />
          ))}
        </div>
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:py-24">
          <div className="fade-up">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={status.phase === 'aberta' ? 'green' : status.phase === 'em_breve' ? 'gold' : 'zinc'}>
                {status.phase === 'aberta' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-ring" />}
                {phaseLabel[status.phase]}
                {status.day && ` · Dia ${status.day} de ${status.totalDays}`}
              </Badge>
              <Badge>Temporada {String(season.number).padStart(2, '0')}</Badge>
            </div>
            <h1 className="mt-6 font-display text-[56px] font-extrabold leading-[0.88] tracking-tight text-white sm:text-[84px] lg:text-[104px]">
              FITNESS
              <br />
              WORLD <span className="bg-gradient-to-b from-gold-300 to-gold-600 bg-clip-text text-transparent">EXPO</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-300">
              A grande feira de negócios do mercado fitness, agora em um centro de convenções virtual em 3D. Caminhe pelos corredores,
              visite os estandes das marcas, converse por voz com vendedores reais e compre direto de quem fabrica.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/feira" className="btn-gold px-6 py-3.5 text-base">
                Entrar no pavilhão 3D <ArrowRight size={18} />
              </Link>
              <Link to="/programacao" className="btn-ghost px-5 py-3.5 text-base">
                <CalendarDays size={18} /> Programação
              </Link>
            </div>
            <div className="mt-8 space-y-3">
              {status.phase === 'em_breve' && status.nextOpen && (
                <>
                  <p className="text-sm text-zinc-400">Abertura em</p>
                  <Countdown to={status.nextOpen} />
                </>
              )}
              {status.phase === 'fechada_hoje' && status.nextOpen && (
                <p className="text-sm text-zinc-400">
                  Pavilhão fechado agora. Reabre em <span className="text-white">{fmtDateTime(status.nextOpen)}</span>. A visita prévia ao ambiente continua disponível.
                </p>
              )}
              {status.phase === 'encerrada' && (
                <p className="text-sm text-zinc-400">
                  Temporada encerrada.{' '}
                  {next ? (
                    <>
                      Próxima edição: <span className="text-white">{next.name}</span> — {fmtDate(next.startDate)}.
                    </>
                  ) : (
                    'Próxima edição em breve.'
                  )}
                </p>
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400">
                <span className="flex items-center gap-2"><CalendarDays size={15} className="text-gold-400" /> {fmtDate(season.startDate, { day: '2-digit', month: 'short' })} – {fmtDate(season.endDate)}</span>
                <span className="flex items-center gap-2"><Clock size={15} className="text-gold-400" /> Diariamente {season.dailyOpen}–{season.dailyClose}</span>
              </div>
            </div>
          </div>
          <div className="fade-up relative" style={{ animationDelay: '0.15s' }}>
            <div className="card relative overflow-hidden p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="eyebrow">Planta do pavilhão</p>
                <span className="text-xs text-zinc-500">{exhibitors.length} expositores</span>
              </div>
              <HallMap brands={st.brands} className="h-[420px] w-full" />
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white/[0.03] py-2"><p className="font-display text-2xl font-bold">{exhibitors.length}</p><p className="text-[11px] text-zinc-500">Estandes</p></div>
                <div className="rounded-xl bg-white/[0.03] py-2"><p className="font-display text-2xl font-bold">{sellers.length}</p><p className="text-[11px] text-zinc-500">Vendedores</p></div>
                <div className="rounded-xl bg-white/[0.03] py-2"><p className="font-display text-2xl font-bold">{products.length}</p><p className="text-[11px] text-zinc-500">Produtos</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <p className="eyebrow">A experiência</p>
        <h2 className="mt-3 max-w-2xl font-display text-4xl font-bold uppercase text-white sm:text-5xl">Uma feira de verdade. Sem sair de casa.</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: MapPinned, t: 'Caminhe pelo pavilhão', d: 'Primeira pessoa no teclado e mouse, ou joystick por toque no celular. Corredores, sinalização, arena de lançamentos e palco.' },
            { icon: Store, t: 'Visite os estandes', d: 'Cada marca monta seu estande: arquitetura, cores, iluminação, telões, vitrines e balcões de atendimento.' },
            { icon: Mic, t: 'Fale com pessoas reais', d: 'Os vendedores são pessoas conectadas controlando seus avatares. Aproxime-se e inicie uma conversa por voz.' },
            { icon: ShoppingCart, t: 'Compre direto da marca', d: 'Adicione ao carrinho dentro do estande. O pedido vai para a marca, que cuida de pagamento, estoque e entrega.' },
          ].map((f) => (
            <div key={f.t} className="card p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gold-400/10 text-gold-300"><f.icon size={20} /></span>
              <h3 className="mt-5 text-lg font-semibold text-white">{f.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EXPOSITORES */}
      <section className="border-y border-white/[0.06] bg-ink-900/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Expositores da temporada</p>
              <h2 className="mt-3 font-display text-4xl font-bold uppercase text-white sm:text-5xl">Marcas no pavilhão</h2>
              <p className="mt-2 text-sm text-zinc-500">Marcas fictícias criadas para demonstração do protótipo.</p>
            </div>
            <Link to="/feira" className="btn-ghost">Explorar em 3D <ArrowRight size={16} /></Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {exhibitors.map((b) => {
              const launches = st.products.filter((p) => p.brandId === b.id && p.isLaunch).length;
              return (
                <Link to={`/feira?estande=${b.id}`} key={b.id} className="group card overflow-hidden transition hover:-translate-y-0.5 hover:border-white/15">
                  <div className="relative h-28 overflow-hidden" style={{ background: `linear-gradient(135deg, ${b.booth.primaryColor}, #07080b)` }}>
                    <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: b.booth.secondaryColor }} />
                    <span className="absolute left-4 top-4 rounded-md bg-black/40 px-2 py-0.5 text-[11px] font-bold tracking-widest text-white">{b.slotId}</span>
                    <span className="absolute right-4 top-4"><Badge tone={b.tier === 'master' ? 'gold' : b.tier === 'premium' ? 'violet' : 'zinc'}>{b.tier}</Badge></span>
                    <p className="absolute bottom-4 left-4 font-display text-3xl font-extrabold tracking-wider" style={{ color: b.booth.secondaryColor }}>{b.booth.logoText}</p>
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-white">{b.name}</p>
                    <p className="text-sm text-zinc-500">{b.segment}</p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-zinc-400">
                      <span>{st.products.filter((p) => p.brandId === b.id).length} produtos</span>
                      {launches > 0 && <span className="flex items-center gap-1 text-gold-300"><Sparkles size={12} /> {launches} lançamento(s)</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* PROGRAMAÇÃO + PATROCINADORES */}
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-20 sm:px-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Próximos eventos</p>
            <Link to="/programacao" className="text-sm text-gold-300 hover:text-gold-200">Ver tudo</Link>
          </div>
          <div className="mt-5 divide-y divide-white/[0.06]">
            {events.length === 0 && <p className="py-6 text-sm text-zinc-500">Nenhum evento futuro nesta temporada.</p>}
            {events.map((e) => (
              <div key={e.id} className="flex items-start gap-4 py-4">
                <div className="w-20 shrink-0 text-center">
                  <p className="font-display text-2xl font-bold text-white">{new Date(e.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  <p className="text-[11px] uppercase text-zinc-500">{fmtDate(e.start, { day: '2-digit', month: 'short' })}</p>
                </div>
                <div>
                  <p className="font-semibold text-white">{e.title}</p>
                  <p className="text-sm text-zinc-500">{e.location} · {e.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <p className="eyebrow">Patrocinadores oficiais</p>
          <div className="mt-5 space-y-3">
            {sponsors.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <span className="font-semibold text-white">{s.name}</span>
                <Badge tone={s.tier === 'diamante' ? 'blue' : s.tier === 'ouro' ? 'gold' : 'zinc'}>{s.tier}</Badge>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl bg-gradient-to-br from-gold-400/10 to-transparent p-4">
            <p className="flex items-center gap-2 font-semibold text-white"><Headphones size={16} className="text-gold-300" /> Atendimento humano</p>
            <p className="mt-1 text-sm text-zinc-400">Nenhum vendedor da feira é robô. Quando o vendedor está online, você fala com uma pessoa real.</p>
          </div>
        </div>
      </section>

      {/* PARA MARCAS */}
      <section className="border-t border-white/[0.06] bg-gradient-to-b from-ink-900/60 to-ink-950">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <p className="eyebrow">Para marcas</p>
          <h2 className="mt-3 max-w-3xl font-display text-4xl font-bold uppercase text-white sm:text-5xl">Seu estande. Sua loja. Seus vendedores.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {(['standard', 'premium', 'master'] as const).map((tier) => (
              <div key={tier} className={`card p-6 ${tier === 'master' ? 'border-gold-400/40' : ''}`}>
                <div className="flex items-center justify-between">
                  <p className="font-display text-2xl font-bold uppercase text-white">{tier}</p>
                  {tier === 'master' && <Badge tone="gold">Mais visibilidade</Badge>}
                </div>
                <p className="mt-4 font-display text-4xl font-bold text-gold-300">{money(st.monetization.participationFee[tier])}</p>
                <p className="text-xs text-zinc-500">por temporada</p>
                <ul className="mt-5 space-y-2 text-sm text-zinc-300">
                  <li>• Estande 15 × 15 m personalizável</li>
                  <li>• Vitrines, balcões e telão de LED</li>
                  <li>• Vendedores com avatar e atendimento por voz</li>
                  <li>• Comissão sobre vendas: {st.monetization.commissionRate}%</li>
                  {tier !== 'standard' && <li>• Destaque no diretório e na página inicial</li>}
                  {tier === 'master' && <li>• Lançamento no Palco Principal</li>}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/expor" className="btn-gold">Quero expor na próxima temporada</Link>
            <Link to="/empresa" className="btn-ghost"><Users size={16} /> Acessar painel da empresa</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
