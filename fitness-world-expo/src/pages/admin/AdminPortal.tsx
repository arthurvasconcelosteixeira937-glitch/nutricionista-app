import { useMemo, useState } from 'react';
import { Navigate, Route, Routes, Link } from 'react-router-dom';
import {
  BadgeDollarSign, BarChart3, Building2, CalendarClock, CalendarRange, Check, Crown, LayoutDashboard, Map as MapIcon, Pencil, Plus, Receipt, ShieldCheck, Trash2, Wand2, X,
} from 'lucide-react';
import { useExpo, resetState } from '@/data/store';
import { adminRepo } from '@/data/repositories';
import type { BoothTier, ExpoState, MonetizationConfig, ScheduleEvent, Season, Sponsor, SponsorTier } from '@/domain/types';
import { signIn, signOut, useSession, type Session } from '@/services/auth';
import { activeSeason, phaseLabel, seasonDays, seasonStatus } from '@/services/season';
import { PageTitle, PortalShell } from '@/components/PortalShell';
import { Badge, Empty, Field, IntegrationTag, Logo, Modal, Notice, Segmented, Stat } from '@/components/ui';
import { HallMap } from '@/components/HallMap';
import { BarChart, Funnel, byDay } from '@/components/charts';
import { orderStatusLabel, summarize } from '@/lib/metrics';
import { SLOTS } from '@/expo/engine/layout';
import { fmtDate, fmtDateTime, fmtNum, money, pct, uid, ymd, addDays } from '@/lib/util';

export default function AdminPortal() {
  const session = useSession();
  const st = useExpo();
  if (!session || session.role !== 'admin') return <AdminLogin />;
  const pending = st.brands.filter((b) => b.status === 'pendente').length;
  return (
    <PortalShell
      title="Administração da plataforma"
      subtitle="FITNESS WORLD EXPO"
      onSignOut={signOut}
      nav={[
        { to: '/admin', label: 'Visão geral', icon: LayoutDashboard, end: true },
        { to: '/admin/temporadas', label: 'Temporadas', icon: CalendarRange },
        { to: '/admin/empresas', label: `Empresas${pending ? ` (${pending})` : ''}`, icon: Building2 },
        { to: '/admin/estandes', label: 'Estandes', icon: MapIcon },
        { to: '/admin/programacao', label: 'Horários e eventos', icon: CalendarClock },
        { to: '/admin/patrocinadores', label: 'Patrocinadores', icon: Crown },
        { to: '/admin/vendas', label: 'Vendas', icon: Receipt },
        { to: '/admin/monetizacao', label: 'Monetização', icon: BadgeDollarSign },
        { to: '/admin/metricas', label: 'Métricas de visitantes', icon: BarChart3 },
      ]}
    >
      <Routes>
        <Route index element={<Dashboard st={st} session={session} />} />
        <Route path="temporadas" element={<Seasons st={st} session={session} />} />
        <Route path="empresas" element={<Companies st={st} session={session} />} />
        <Route path="estandes" element={<Booths st={st} session={session} />} />
        <Route path="programacao" element={<Schedule st={st} session={session} />} />
        <Route path="patrocinadores" element={<Sponsors st={st} session={session} />} />
        <Route path="vendas" element={<Sales st={st} />} />
        <Route path="monetizacao" element={<Monetization st={st} session={session} />} />
        <Route path="metricas" element={<Metrics st={st} />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </PortalShell>
  );
}

function AdminLogin() {
  return (
    <div className="grid-bg grid min-h-screen place-items-center p-4">
      <div className="card w-full max-w-md p-8">
        <Logo />
        <h1 className="mt-8 font-display text-4xl font-bold uppercase">Administração</h1>
        <p className="mt-2 text-sm text-zinc-400">Temporadas, empresas, estandes, patrocínios, comissões e métricas da plataforma.</p>
        <div className="mt-6"><Notice title="Login demonstrativo">Autenticação real com papéis (RBAC) e auditoria: integração pendente.</Notice></div>
        <button className="btn-gold mt-6 w-full" onClick={() => signIn({ role: 'admin', name: 'Administrador' })}><ShieldCheck size={16} /> Entrar como administrador</button>
        <Link to="/" className="mt-4 block text-center text-sm text-zinc-500 hover:text-white">← Voltar</Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function revenueStreams(st: ExpoState) {
  const season = activeSeason(st)!;
  const days = seasonDays(season);
  const m = st.monetization;
  const participants = st.brands.filter((b) => b.status === 'aprovada' && b.seasonIds.includes(season.id));
  const participation = participants.reduce((a, b) => a + m.participationFee[b.tier], 0);
  const premiumExtra = participants.filter((b) => b.tier !== 'standard').reduce((a, b) => a + (m.participationFee[b.tier] - m.participationFee.standard), 0);
  const sponsorship = st.sponsors.filter((s) => s.seasonId === season.id && s.contractStatus === 'assinado').reduce((a, s) => a + s.value, 0);
  const orders = st.orders.filter((o) => o.status !== 'cancelado' && o.seasonId === season.id);
  const commission = orders.reduce((a, o) => a + o.commissionValue, 0);
  const ads = m.adSlots.filter((a) => a.active && a.advertiser).reduce((a, s) => a + s.pricePerDay * days, 0);
  const gmv = orders.reduce((a, o) => a + o.total, 0);
  return { participation, premiumExtra, sponsorship, commission, ads, gmv, total: participation + sponsorship + commission + ads, participants: participants.length, days };
}

function DemoControls({ session, st }: { session: Session; st: ExpoState }) {
  const has = st.orders.some((o) => o.isDemo) || st.analytics.some((a) => a.isDemo);
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <div className="card p-5">
      <p className="eyebrow">Dados de demonstração</p>
      <p className="mt-2 text-sm text-zinc-400">Para visualizar os painéis preenchidos, gere pedidos e visitas fictícios. Eles ficam marcados como <Badge tone="amber">demo</Badge> em todas as telas e podem ser removidos.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-ghost" onClick={() => adminRepo.generateDemoData(session)}><Wand2 size={15} /> Gerar dados de demonstração</button>
        {has && <button className="btn-ghost" onClick={() => adminRepo.clearDemoData(session)}><X size={15} /> Remover dados de demonstração</button>}
        <button className="btn-danger" onClick={() => setConfirmReset(true)}>Restaurar protótipo</button>
      </div>
      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Restaurar protótipo">
        <p className="text-sm text-zinc-300">Isso apaga todas as alterações deste navegador (estandes, produtos, pedidos, temporadas) e volta aos dados iniciais.</p>
        <div className="mt-5 flex justify-end gap-2"><button className="btn-ghost" onClick={() => setConfirmReset(false)}>Cancelar</button><button className="btn-danger" onClick={() => { resetState(); setConfirmReset(false); }}>Restaurar</button></div>
      </Modal>
    </div>
  );
}

function Dashboard({ st, session }: { st: ExpoState; session: Session }) {
  const season = activeSeason(st)!;
  const status = seasonStatus(season);
  const r = revenueStreams(st);
  const s = summarize(st.analytics.filter((a) => a.seasonId === season.id), st.orders.filter((o) => o.seasonId === season.id));
  const daily = useMemo(() => byDay(st.orders.filter((o) => o.status !== 'cancelado'), (o) => o.createdAt, (o) => o.total, 7), [st.orders]);
  const pending = st.brands.filter((b) => b.status === 'pendente');
  return (
    <>
      <PageTitle eyebrow={season.name} title="Visão geral">
        <Badge tone={status.phase === 'aberta' ? 'green' : 'zinc'}>{phaseLabel[status.phase]}</Badge> · {fmtDate(season.startDate)} a {fmtDate(season.endDate)} · {season.dailyOpen}–{season.dailyClose}
      </PageTitle>
      {pending.length > 0 && (
        <div className="mb-5"><Notice tone="blue" title={`${pending.length} inscrição(ões) aguardando aprovação`}><Link to="/admin/empresas" className="underline">Revisar empresas →</Link></Notice></div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Receita da plataforma (temporada)" value={money(r.total)} accent hint="participação + patrocínio + comissões + publicidade" />
        <Stat label="Volume de vendas (GMV)" value={money(r.gmv)} />
        <Stat label="Visitantes únicos" value={fmtNum(s.visitors)} />
        <Stat label="Expositores" value={r.participants} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="card p-5">
          <p className="mb-4 text-sm font-semibold">Receita por fonte</p>
          <div className="space-y-3 text-sm">
            {[
              ['Participação das marcas', r.participation, `${r.participants} marcas · inclui ${money(r.premiumExtra)} de upgrades premium/master`],
              ['Patrocínios oficiais', r.sponsorship, 'contratos assinados'],
              ['Comissões sobre vendas', r.commission, `${s.orders} pedidos`],
              ['Publicidade no ambiente', r.ads, `${r.days} dias × espaços vendidos`],
            ].map(([l, v, h]) => (
              <div key={String(l)}>
                <div className="flex justify-between"><span className="text-zinc-300">{l}</span><span className="font-semibold">{money(Number(v))}</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-gold-400" style={{ width: `${r.total ? (Number(v) / r.total) * 100 : 0}%` }} /></div>
                <p className="mt-0.5 text-[11px] text-zinc-500">{h}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-2 text-[11px] text-zinc-500"><IntegrationTag kind="simulado" /> Cobrança das marcas e faturamento: integração pendente.</p>
        </div>
        <div className="card p-5">
          <p className="mb-4 text-sm font-semibold">Vendas por dia (R$) — todas as marcas</p>
          <BarChart data={daily} label="Vendas por dia" format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0))} />
        </div>
      </div>
      <div className="mt-4"><DemoControls session={session} st={st} /></div>
    </>
  );
}

// ---------------------------------------------------------------------------

function Seasons({ st, session }: { st: ExpoState; session: Session }) {
  const [edit, setEdit] = useState<Season | null>(null);
  const create = () => {
    const last = [...st.seasons].sort((a, b) => b.number - a.number)[0];
    const start = addDays(new Date(), 60);
    setEdit({ id: uid('season-'), number: (last?.number ?? 0) + 1, name: `FITNESS WORLD EXPO — TEMPORADA ${String((last?.number ?? 0) + 1).padStart(2, '0')}`, theme: '', startDate: ymd(start), endDate: ymd(addDays(start, 4)), dailyOpen: '10:00', dailyClose: '22:00', status: 'rascunho', description: '' });
  };
  return (
    <>
      <PageTitle eyebrow="Calendário" title="Temporadas" actions={<button className="btn-gold" onClick={create}><Plus size={16} /> Nova temporada</button>}>
        A feira funciona por temporadas com data de abertura, encerramento e horário diário. Entre temporadas, visitantes veem a próxima edição.
      </PageTitle>
      <div className="space-y-3">
        {[...st.seasons].sort((a, b) => a.startDate.localeCompare(b.startDate)).map((s) => {
          const ss = seasonStatus(s);
          const active = s.id === st.activeSeasonId;
          return (
            <div key={s.id} className={`card flex flex-wrap items-center gap-4 p-4 ${active ? 'border-gold-400/40' : ''}`}>
              <div className="font-display text-4xl font-bold text-gold-300">{String(s.number).padStart(2, '0')}</div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{s.name} {active && <Badge tone="gold">temporada ativa</Badge>}</p>
                <p className="text-sm text-zinc-500">{fmtDate(s.startDate)} – {fmtDate(s.endDate)} · {seasonDays(s)} dias · {s.dailyOpen}–{s.dailyClose} · {s.theme}</p>
              </div>
              <Badge tone={s.status === 'publicada' ? 'green' : 'zinc'}>{s.status}</Badge>
              <Badge>{phaseLabel[ss.phase]}</Badge>
              {!active && <button className="btn-ghost py-1.5 text-xs" onClick={() => adminRepo.setActiveSeason(session, s.id)}>Tornar ativa</button>}
              <button className="btn-ghost py-1.5 text-xs" onClick={() => setEdit(s)}><Pencil size={13} /> Editar</button>
              {!active && <button className="rounded-lg p-2 text-zinc-500 hover:text-red-300" onClick={() => adminRepo.deleteSeason(session, s.id)} aria-label="Excluir"><Trash2 size={14} /></button>}
            </div>
          );
        })}
      </div>
      {edit && <SeasonForm key={edit.id} initial={edit} onClose={() => setEdit(null)} onSave={(s) => { adminRepo.upsertSeason(session, s); setEdit(null); }} />}
    </>
  );
}

function SeasonForm({ initial, onClose, onSave }: { initial: Season; onClose: () => void; onSave: (s: Season) => void }) {
  const [s, setS] = useState(initial);
  const set = <K extends keyof Season>(k: K, v: Season[K]) => setS((x) => ({ ...x, [k]: v }));
  const valid = s.name.trim() && s.startDate <= s.endDate && s.dailyOpen < s.dailyClose;
  return (
    <Modal open onClose={onClose} title={initial.theme || initial.description ? 'Editar temporada' : 'Nova temporada'}>
      <div className="space-y-3">
        <Field label="Nome"><input className="input" value={s.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Tema"><input className="input" value={s.theme} onChange={(e) => set('theme', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Abertura"><input type="date" className="input" value={s.startDate} onChange={(e) => set('startDate', e.target.value)} /></Field>
          <Field label="Encerramento"><input type="date" className="input" value={s.endDate} onChange={(e) => set('endDate', e.target.value)} /></Field>
          <Field label="Abre às"><input type="time" className="input" value={s.dailyOpen} onChange={(e) => set('dailyOpen', e.target.value)} /></Field>
          <Field label="Fecha às"><input type="time" className="input" value={s.dailyClose} onChange={(e) => set('dailyClose', e.target.value)} /></Field>
        </div>
        <Field label="Status"><Segmented value={s.status} options={[{ value: 'rascunho', label: 'Rascunho' }, { value: 'publicada', label: 'Publicada' }]} onChange={(v) => set('status', v)} /></Field>
        <Field label="Descrição"><textarea className="input min-h-[70px]" value={s.description} onChange={(e) => set('description', e.target.value)} /></Field>
        {!valid && <p className="text-xs text-red-300">Verifique nome, datas e horários.</p>}
        <div className="flex justify-end gap-2 pt-2"><button className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-gold" disabled={!valid} onClick={() => onSave(s)}>Salvar</button></div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function Companies({ st, session }: { st: ExpoState; session: Session }) {
  const season = activeSeason(st)!;
  const free = (current: string | null) => SLOTS.filter((s) => s.id === current || !st.brands.some((b) => b.slotId === s.id && b.status === 'aprovada'));
  const [filter, setFilter] = useState<'todas' | 'pendente' | 'aprovada' | 'suspensa'>('todas');
  const list = st.brands.filter((b) => filter === 'todas' || b.status === filter);
  return (
    <>
      <PageTitle eyebrow="Expositores" title="Empresas">Aprove inscrições, defina o plano (standard, premium, master) e posicione cada estande no pavilhão.</PageTitle>
      <div className="mb-4 max-w-md"><Segmented value={filter} options={[{ value: 'todas', label: 'Todas' }, { value: 'pendente', label: 'Pendentes' }, { value: 'aprovada', label: 'Aprovadas' }, { value: 'suspensa', label: 'Suspensas' }]} onChange={setFilter} /></div>
      <div className="space-y-3">
        {list.length === 0 && <Empty title="Nenhuma empresa neste filtro" />}
        {list.map((b) => (
          <div key={b.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl font-display font-bold" style={{ background: b.booth.primaryColor, color: b.booth.secondaryColor }}>{b.booth.logoText.slice(0, 2)}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{b.name} {b.isDemo && <Badge>fictícia</Badge>}</p>
                <p className="text-xs text-zinc-500">{b.segment} · {b.contactEmail} · inscrita em {fmtDate(b.createdAt)}</p>
              </div>
              <Badge tone={b.status === 'aprovada' ? 'green' : b.status === 'pendente' ? 'amber' : 'red'}>{b.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-zinc-400">{b.description}</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <Field label="Plano">
                <select className="input py-2" value={b.tier} onChange={(e) => adminRepo.updateBrand(session, b.id, { tier: e.target.value as BoothTier })}>
                  {(['standard', 'premium', 'master'] as BoothTier[]).map((t) => <option key={t} value={t}>{t} — {money(st.monetization.participationFee[t])}</option>)}
                </select>
              </Field>
              <Field label="Posição no pavilhão">
                <select className="input py-2" value={b.slotId ?? ''} onChange={(e) => adminRepo.updateBrand(session, b.id, { slotId: e.target.value || null })}>
                  <option value="">Sem posição</option>
                  {free(b.slotId).map((s) => <option key={s.id} value={s.id}>{s.id} · Pavilhão {s.row} ({s.side})</option>)}
                </select>
              </Field>
              <div className="flex gap-2">
                {b.status !== 'aprovada' && (
                  <button className="btn-gold py-2" onClick={() => adminRepo.updateBrand(session, b.id, { status: 'aprovada', seasonIds: Array.from(new Set([...b.seasonIds, season.id])) })}><Check size={15} /> Aprovar</button>
                )}
                {b.status === 'aprovada' && <button className="btn-danger py-2" onClick={() => adminRepo.updateBrand(session, b.id, { status: 'suspensa' })}>Suspender</button>}
              </div>
            </div>
            {b.status === 'aprovada' && !b.slotId && <p className="mt-2 text-xs text-amber-300">Aprovada sem posição: o estande não aparece no pavilhão até receber uma posição.</p>}
          </div>
        ))}
      </div>
    </>
  );
}

function Booths({ st, session }: { st: ExpoState; session: Session }) {
  const [slot, setSlot] = useState<string | null>('A1');
  const occupant = st.brands.find((b) => b.slotId === slot && b.status === 'aprovada');
  const candidates = st.brands.filter((b) => b.status === 'aprovada');
  return (
    <>
      <PageTitle eyebrow="Planta" title="Estandes">Clique em uma posição para ver ou alterar a marca alocada. Estandes premium e master recebem localização de maior fluxo.</PageTitle>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="card p-3"><HallMap brands={st.brands} selectedSlot={slot} onSlotClick={setSlot} className="h-[520px] w-full" /></div>
        <div className="space-y-4">
          <div className="card p-5">
            <p className="eyebrow">Posição {slot}</p>
            {occupant ? (
              <>
                <p className="mt-2 text-lg font-semibold">{occupant.name}</p>
                <p className="text-sm text-zinc-500">Plano {occupant.tier} · arquitetura {occupant.booth.architecture}</p>
              </>
            ) : <p className="mt-2 text-sm text-zinc-400">Disponível</p>}
            <Field label="Alocar marca">
              <select className="input mt-1" value={occupant?.id ?? ''} onChange={(e) => {
                if (!slot) return;
                if (occupant) adminRepo.updateBrand(session, occupant.id, { slotId: null });
                if (e.target.value) adminRepo.updateBrand(session, e.target.value, { slotId: slot });
              }}>
                <option value="">— Deixar disponível —</option>
                {candidates.map((b) => <option key={b.id} value={b.id}>{b.name}{b.slotId && b.slotId !== slot ? ` (hoje em ${b.slotId})` : ''}</option>)}
              </select>
            </Field>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="table-head">Posição</th><th className="table-head">Marca</th><th className="table-head">Plano</th></tr></thead>
              <tbody>
                {SLOTS.map((s) => {
                  const b = st.brands.find((x) => x.slotId === s.id && x.status === 'aprovada');
                  return <tr key={s.id} className={`cursor-pointer ${slot === s.id ? 'bg-white/[0.04]' : ''}`} onClick={() => setSlot(s.id)}><td className="table-cell font-semibold">{s.id}</td><td className="table-cell">{b?.name ?? <span className="text-zinc-500">Disponível</span>}</td><td className="table-cell">{b ? <Badge tone={b.tier === 'master' ? 'gold' : b.tier === 'premium' ? 'violet' : 'zinc'}>{b.tier}</Badge> : '—'}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

const EVENT_TYPES: Record<ScheduleEvent['type'], string> = { lancamento: 'Lançamento', palestra: 'Palestra', promocao: 'Promoção', especial: 'Evento especial', competicao: 'Competição' };

function Schedule({ st, session }: { st: ExpoState; session: Session }) {
  const season = activeSeason(st)!;
  const [edit, setEdit] = useState<ScheduleEvent | null>(null);
  const events = st.events.filter((e) => e.seasonId === season.id).sort((a, b) => a.start.localeCompare(b.start));
  const days = seasonDays(season);
  const brandsWithSellers = st.brands.filter((b) => b.status === 'aprovada');
  const newEvent = (): ScheduleEvent => {
    const start = new Date(`${season.startDate}T14:00:00`);
    return { id: uid('e-'), seasonId: season.id, title: '', type: 'palestra', brandId: null, location: 'Palco Principal', start: start.toISOString(), end: new Date(start.getTime() + 3600000).toISOString(), description: '' };
  };
  return (
    <>
      <PageTitle eyebrow={season.name} title="Horários e eventos" actions={<button className="btn-gold" onClick={() => setEdit(newEvent())}><Plus size={16} /> Novo evento</button>}>
        Programação do Palco Principal, lançamentos, promoções e eventos especiais. O telão do palco exibe automaticamente o evento ao vivo ou o próximo.
      </PageTitle>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead><tr><th className="table-head">Quando</th><th className="table-head">Evento</th><th className="table-head">Tipo</th><th className="table-head">Local</th><th className="table-head" /></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td className="table-cell whitespace-nowrap text-zinc-400">{fmtDateTime(e.start)}–{new Date(e.end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                <td className="table-cell"><p className="font-medium text-white">{e.title}</p>{e.brandId && <p className="text-xs text-zinc-500">{st.brands.find((b) => b.id === e.brandId)?.name}</p>}</td>
                <td className="table-cell"><Badge tone={e.type === 'lancamento' ? 'gold' : e.type === 'promocao' ? 'green' : 'zinc'}>{EVENT_TYPES[e.type]}</Badge></td>
                <td className="table-cell text-zinc-400">{e.location}</td>
                <td className="table-cell text-right"><button className="p-2 text-zinc-400 hover:text-white" onClick={() => setEdit(e)} aria-label="Editar"><Pencil size={14} /></button><button className="p-2 text-zinc-500 hover:text-red-300" onClick={() => adminRepo.deleteEvent(session, e.id)} aria-label="Excluir"><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 mt-10 font-display text-2xl font-bold uppercase">Plantões dos vendedores</h2>
      <p className="mb-4 text-sm text-zinc-400">Horários definidos por cada marca. Visitantes veem estes horários quando o vendedor está offline.</p>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead><tr><th className="table-head">Vendedor</th>{Array.from({ length: days }).map((_, i) => <th key={i} className="table-head">Dia {i + 1}<br /><span className="normal-case tracking-normal">{fmtDate(addDays(new Date(`${season.startDate}T12:00:00`), i), { day: '2-digit', month: '2-digit' })}</span></th>)}</tr></thead>
          <tbody>
            {brandsWithSellers.flatMap((b) => st.sellers.filter((s) => s.brandId === b.id).map((s) => (
              <tr key={s.id}>
                <td className="table-cell"><p className="font-medium">{s.name}</p><p className="text-xs" style={{ color: b.booth.secondaryColor }}>{b.name}</p></td>
                {Array.from({ length: days }).map((_, i) => {
                  const sh = s.shifts.filter((x) => x.day === i + 1);
                  return <td key={i} className="table-cell text-xs">{sh.length ? sh.map((x) => <div key={x.start} className="rounded bg-gold-400/10 px-1.5 py-0.5 text-gold-200">{x.start}–{x.end}</div>) : <span className="text-zinc-600">—</span>}</td>;
                })}
              </tr>
            )))}
          </tbody>
        </table>
      </div>
      {edit && <EventForm key={edit.id} initial={edit} st={st} onClose={() => setEdit(null)} onSave={(e) => { adminRepo.upsertEvent(session, e); setEdit(null); }} />}
    </>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function EventForm({ initial, st, onClose, onSave }: { initial: ScheduleEvent; st: ExpoState; onClose: () => void; onSave: (e: ScheduleEvent) => void }) {
  const [e, setE] = useState(initial);
  const set = <K extends keyof ScheduleEvent>(k: K, v: ScheduleEvent[K]) => setE((x) => ({ ...x, [k]: v }));
  const valid = e.title.trim() && e.start < e.end;
  return (
    <Modal open onClose={onClose} title={initial.title ? 'Editar evento' : 'Novo evento'}>
      <div className="space-y-3">
        <Field label="Título"><input className="input" value={e.title} onChange={(x) => set('title', x.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo"><select className="input" value={e.type} onChange={(x) => set('type', x.target.value as ScheduleEvent['type'])}>{Object.entries(EVENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Marca (opcional)"><select className="input" value={e.brandId ?? ''} onChange={(x) => set('brandId', x.target.value || null)}><option value="">Nenhuma</option>{st.brands.filter((b) => b.status === 'aprovada').map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
          <Field label="Início"><input type="datetime-local" className="input" value={toLocalInput(e.start)} onChange={(x) => set('start', new Date(x.target.value).toISOString())} /></Field>
          <Field label="Fim"><input type="datetime-local" className="input" value={toLocalInput(e.end)} onChange={(x) => set('end', new Date(x.target.value).toISOString())} /></Field>
        </div>
        <Field label="Local"><input className="input" value={e.location} onChange={(x) => set('location', x.target.value)} /></Field>
        <Field label="Descrição"><textarea className="input min-h-[70px]" value={e.description} onChange={(x) => set('description', x.target.value)} /></Field>
        <div className="flex justify-end gap-2 pt-2"><button className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-gold" disabled={!valid} onClick={() => onSave(e)}>Salvar</button></div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function Sponsors({ st, session }: { st: ExpoState; session: Session }) {
  const season = activeSeason(st)!;
  const [edit, setEdit] = useState<Sponsor | null>(null);
  const list = st.sponsors.filter((s) => s.seasonId === season.id);
  return (
    <>
      <PageTitle eyebrow={season.name} title="Patrocinadores" actions={<button className="btn-gold" onClick={() => setEdit({ id: uid('sp-'), seasonId: season.id, name: '', tier: 'prata', value: st.monetization.sponsorshipPrice.prata, placements: [], contractStatus: 'proposta' })}><Plus size={16} /> Novo patrocinador</button>}>
        Patrocinadores assinados aparecem nos totens do lobby; o patrocinador Diamante dá nome ao Palco Principal e ao arco de entrada.
      </PageTitle>
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((s) => (
          <div key={s.id} className="card p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white">{s.name}</p>
              <Badge tone={s.tier === 'diamante' ? 'blue' : s.tier === 'ouro' ? 'gold' : 'zinc'}>{s.tier}</Badge>
            </div>
            <p className="mt-1 font-display text-2xl font-bold">{money(s.value)}</p>
            <p className="mt-1 text-xs text-zinc-500">{s.placements.join(' · ') || 'Sem entregas definidas'}</p>
            <div className="mt-3 flex items-center justify-between">
              <Badge tone={s.contractStatus === 'assinado' ? 'green' : s.contractStatus === 'proposta' ? 'amber' : 'red'}>{s.contractStatus}</Badge>
              <div><button className="p-2 text-zinc-400 hover:text-white" onClick={() => setEdit(s)} aria-label="Editar"><Pencil size={14} /></button><button className="p-2 text-zinc-500 hover:text-red-300" onClick={() => adminRepo.deleteSponsor(session, s.id)} aria-label="Excluir"><Trash2 size={14} /></button></div>
            </div>
          </div>
        ))}
      </div>
      {edit && <SponsorForm key={edit.id} initial={edit} st={st} onClose={() => setEdit(null)} onSave={(s) => { adminRepo.upsertSponsor(session, s); setEdit(null); }} />}
    </>
  );
}

function SponsorForm({ initial, st, onClose, onSave }: { initial: Sponsor; st: ExpoState; onClose: () => void; onSave: (s: Sponsor) => void }) {
  const [s, setS] = useState(initial);
  const set = <K extends keyof Sponsor>(k: K, v: Sponsor[K]) => setS((x) => ({ ...x, [k]: v }));
  return (
    <Modal open onClose={onClose} title={initial.name ? 'Editar patrocinador' : 'Novo patrocinador'}>
      <div className="space-y-3">
        <Field label="Nome"><input className="input" value={s.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Cota"><Segmented value={s.tier} options={(['diamante', 'ouro', 'prata'] as SponsorTier[]).map((t) => ({ value: t, label: t }))} onChange={(v) => { set('tier', v); set('value', st.monetization.sponsorshipPrice[v]); }} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor (R$)"><input type="number" className="input" value={s.value} onChange={(e) => set('value', Number(e.target.value))} /></Field>
          <Field label="Contrato"><select className="input" value={s.contractStatus} onChange={(e) => set('contractStatus', e.target.value as Sponsor['contractStatus'])}><option value="proposta">Proposta</option><option value="assinado">Assinado</option><option value="cancelado">Cancelado</option></select></Field>
        </div>
        <Field label="Entregas (separadas por vírgula)"><input className="input" value={s.placements.join(', ')} onChange={(e) => set('placements', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} /></Field>
        <div className="flex justify-end gap-2 pt-2"><button className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-gold" disabled={!s.name.trim()} onClick={() => onSave(s)}>Salvar</button></div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function Sales({ st }: { st: ExpoState }) {
  const [brand, setBrand] = useState('');
  const orders = st.orders.filter((o) => !brand || o.brandId === brand).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const s = summarize([], orders);
  return (
    <>
      <PageTitle eyebrow="Comércio" title="Vendas">Todos os pedidos realizados na feira. Cada pedido pertence a uma marca, que processa pagamento e entrega.</PageTitle>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className="input max-w-xs" value={brand} onChange={(e) => setBrand(e.target.value)}><option value="">Todas as marcas</option>{st.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <IntegrationTag kind="simulado" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pedidos" value={s.orders} />
        <Stat label="GMV" value={money(s.revenue)} accent />
        <Stat label="Comissões" value={money(s.commission)} />
        <Stat label="Ticket médio" value={money(s.avgTicket)} />
      </div>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead><tr><th className="table-head">Pedido</th><th className="table-head">Marca</th><th className="table-head">Cliente</th><th className="table-head">Total</th><th className="table-head">Comissão</th><th className="table-head">Status</th></tr></thead>
          <tbody>
            {orders.length === 0 && <tr><td colSpan={6} className="table-cell py-8 text-center text-zinc-500">Nenhum pedido ainda.</td></tr>}
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="table-cell font-mono text-xs">{o.code} {o.isDemo && <Badge tone="amber">demo</Badge>}<p className="font-sans text-[11px] text-zinc-500">{fmtDateTime(o.createdAt)}</p></td>
                <td className="table-cell">{st.brands.find((b) => b.id === o.brandId)?.name}</td>
                <td className="table-cell text-zinc-400">{o.customer.name}</td>
                <td className="table-cell font-semibold">{money(o.total)}</td>
                <td className="table-cell text-zinc-400">{money(o.commissionValue)} ({pct(o.commissionRate)})</td>
                <td className="table-cell"><Badge tone={o.status === 'cancelado' ? 'red' : o.status === 'entregue' ? 'green' : 'zinc'}>{orderStatusLabel[o.status]}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

function Monetization({ st, session }: { st: ExpoState; session: Session }) {
  const [m, setM] = useState<MonetizationConfig>(st.monetization);
  const dirty = JSON.stringify(m) !== JSON.stringify(st.monetization);
  const num = (v: string) => Math.max(0, Number(v) || 0);
  return (
    <>
      <PageTitle eyebrow="Modelo de negócio" title="Monetização" actions={<><button className="btn-ghost" disabled={!dirty} onClick={() => setM(st.monetization)}>Descartar</button><button className="btn-gold" disabled={!dirty} onClick={() => adminRepo.updateMonetization(session, m)}>Salvar configurações</button></>}>
        Valores de participação, estandes premium, patrocínios, comissões e publicidade. A comissão é congelada em cada pedido no momento da compra.
      </PageTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3 p-5">
          <p className="eyebrow">1 · 2 — Participação por temporada e estandes premium</p>
          {(['standard', 'premium', 'master'] as BoothTier[]).map((t) => (
            <Field key={t} label={`Plano ${t}`}><input type="number" className="input" value={m.participationFee[t]} onChange={(e) => setM({ ...m, participationFee: { ...m.participationFee, [t]: num(e.target.value) } })} /></Field>
          ))}
          <p className="text-[11px] text-zinc-500">Premium e Master liberam arquitetura Mezanino, 2 balcões e posições de maior fluxo.</p>
        </section>
        <section className="card space-y-3 p-5">
          <p className="eyebrow">3 — Cotas de patrocínio oficial</p>
          {(['diamante', 'ouro', 'prata'] as SponsorTier[]).map((t) => (
            <Field key={t} label={`Cota ${t}`}><input type="number" className="input" value={m.sponsorshipPrice[t]} onChange={(e) => setM({ ...m, sponsorshipPrice: { ...m.sponsorshipPrice, [t]: num(e.target.value) } })} /></Field>
          ))}
        </section>
        <section className="card space-y-3 p-5">
          <p className="eyebrow">4 — Comissão sobre vendas</p>
          <Field label="Comissão padrão (%)"><input type="number" step="0.1" min="0" max="100" className="input" value={m.commissionRate} onChange={(e) => setM({ ...m, commissionRate: Math.min(100, num(e.target.value)) })} /></Field>
          <p className="label mt-3">Comissão negociada por marca (deixe vazio para usar a padrão)</p>
          <div className="space-y-2">
            {st.brands.filter((b) => b.status === 'aprovada').map((b) => (
              <div key={b.id} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-sm">{b.name}</span>
                <input type="number" step="0.1" className="input w-28 py-2" placeholder={String(m.commissionRate)} value={m.brandCommissionOverrides[b.id] ?? ''} onChange={(e) => {
                  const o = { ...m.brandCommissionOverrides };
                  if (e.target.value === '') delete o[b.id]; else o[b.id] = Math.min(100, num(e.target.value));
                  setM({ ...m, brandCommissionOverrides: o });
                }} />
              </div>
            ))}
          </div>
        </section>
        <section className="card space-y-3 p-5">
          <p className="eyebrow">5 — Publicidade no ambiente virtual</p>
          {m.adSlots.map((a, i) => (
            <div key={a.id} className="rounded-xl border border-white/[0.06] p-3">
              <div className="flex items-center justify-between"><p className="text-sm font-semibold">{a.name}</p><label className="flex items-center gap-2 text-xs"><input type="checkbox" className="accent-[#e9c46a]" checked={a.active} onChange={(e) => setM({ ...m, adSlots: m.adSlots.map((x, j) => (j === i ? { ...x, active: e.target.checked } : x)) })} /> ativo</label></div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Field label="Preço por dia (R$)"><input type="number" className="input py-2" value={a.pricePerDay} onChange={(e) => setM({ ...m, adSlots: m.adSlots.map((x, j) => (j === i ? { ...x, pricePerDay: num(e.target.value) } : x)) })} /></Field>
                <Field label="Anunciante"><input className="input py-2" placeholder="Disponível" value={a.advertiser ?? ''} onChange={(e) => setM({ ...m, adSlots: m.adSlots.map((x, j) => (j === i ? { ...x, advertiser: e.target.value || null } : x)) })} /></Field>
              </div>
              <Field label="Mensagem exibida no telão"><input className="input mt-1 py-2" value={a.message} onChange={(e) => setM({ ...m, adSlots: m.adSlots.map((x, j) => (j === i ? { ...x, message: e.target.value } : x)) })} /></Field>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

function Metrics({ st }: { st: ExpoState }) {
  const season = activeSeason(st)!;
  const an = st.analytics.filter((a) => a.seasonId === season.id);
  const s = summarize(an, st.orders.filter((o) => o.seasonId === season.id));
  const brands = st.brands.filter((b) => b.status === 'aprovada');
  const perBrand = brands.map((b) => ({ label: b.booth.logoText.slice(0, 8), value: new Set(an.filter((a) => a.brandId === b.id && a.type === 'visita_estande').map((a) => a.visitorId)).size }));
  const daily = byDay(an.filter((a) => a.type === 'sessao'), (a) => a.ts, () => 1, 7);
  return (
    <>
      <PageTitle eyebrow={season.name} title="Métricas de visitantes">Comportamento dos visitantes no pavilhão 3D.</PageTitle>
      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-zinc-500"><IntegrationTag kind="local" /> Eventos registrados neste navegador. Coleta centralizada (analytics em servidor): integração pendente. {s.hasDemo && <Badge tone="amber">inclui dados de demonstração</Badge>}</div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Visitantes únicos" value={fmtNum(s.visitors)} />
        <Stat label="Entradas no pavilhão" value={fmtNum(s.sessions)} />
        <Stat label="Pedidos de atendimento por voz" value={fmtNum(s.callRequests)} hint={`${s.callsConnected} conectados`} />
        <Stat label="Conversão em compra" value={pct(s.conversion)} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5"><p className="mb-4 text-sm font-semibold">Visitantes únicos por estande</p><BarChart data={perBrand} label="Visitantes por estande" /></div>
        <div className="card p-5"><p className="mb-4 text-sm font-semibold">Entradas no pavilhão por dia</p><BarChart data={daily} label="Entradas por dia" /></div>
      </div>
      <div className="card mt-4 p-5">
        <p className="mb-4 text-sm font-semibold">Funil da feira (visitantes únicos)</p>
        <Funnel steps={[
          { label: 'Visitaram estandes', value: s.boothVisitors },
          { label: 'Viram produtos', value: s.productViewers },
          { label: 'Adicionaram ao carrinho', value: s.cartUsers },
          { label: 'Compraram', value: s.buyers },
        ]} />
      </div>
    </>
  );
}
