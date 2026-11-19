import { useMemo, useState } from 'react';
import { Navigate, Route, Routes, Link, useNavigate } from 'react-router-dom';
import {
  BarChart3, Boxes, ExternalLink, LayoutDashboard, Package, Plus, Receipt, Save, Store, Trash2, Upload, Users, UserRound, Eye, Pencil, Lock,
} from 'lucide-react';
import { useExpo } from '@/data/store';
import { AccessDenied, brandRepo, brandView } from '@/data/repositories';
import type { AvatarConfig, BoothArchitecture, BoothConfig, Brand, ExpoState, Order, OrderStatus, Product, Seller, Shift } from '@/domain/types';
import { signIn, signOut, useSession, type Session } from '@/services/auth';
import { activeSeason, seasonDays } from '@/services/season';
import { PageTitle, PortalShell } from '@/components/PortalShell';
import { Badge, ColorInput, Empty, Field, IntegrationTag, Logo, Modal, Notice, Segmented, Stat } from '@/components/ui';
import { AvatarPreview, BoothPreview } from '@/components/Preview3D';
import { BarChart, Funnel, byDay } from '@/components/charts';
import { analyticsLabel, orderStatusLabel, summarize, topProducts } from '@/lib/metrics';
import { fileToDataUrl, fmtDateTime, money, pct, shortId, uid } from '@/lib/util';

type View = ReturnType<typeof brandView>;

export default function BrandPortal() {
  const session = useSession();
  const st = useExpo();
  if (!session || session.role !== 'brand') return <BrandLogin st={st} />;
  let view: View;
  try {
    view = brandView(st, session, session.brandId);
  } catch (e) {
    if (e instanceof AccessDenied) return <BrandLogin st={st} />;
    throw e;
  }
  if (!view.brand) return <BrandLogin st={st} />;
  const b = view.brand;
  return (
    <PortalShell
      title={b.name}
      subtitle={`Painel da empresa · ${b.slotId ? `Estande ${b.slotId}` : 'sem estande atribuído'}`}
      accent={b.booth.secondaryColor}
      onSignOut={signOut}
      badge={<div className="rounded-xl bg-white/[0.03] p-3 text-[11px] text-zinc-500">Você vê apenas os dados da <b className="text-zinc-300">{b.name}</b>.</div>}
      nav={[
        { to: '/empresa', label: 'Visão geral', icon: LayoutDashboard, end: true },
        { to: '/empresa/estande', label: 'Estande', icon: Store },
        { to: '/empresa/produtos', label: 'Produtos', icon: Package },
        { to: '/empresa/vendedores', label: 'Vendedores', icon: Users },
        { to: '/empresa/visitantes', label: 'Visitantes', icon: Eye },
        { to: '/empresa/vendas', label: 'Vendas', icon: Receipt },
        { to: '/empresa/resultados', label: 'Resultados', icon: BarChart3 },
      ]}
    >
      <Routes>
        <Route index element={<Overview view={view} st={st} />} />
        <Route path="estande" element={<BoothEditor view={view} session={session} />} />
        <Route path="produtos" element={<ProductsPage view={view} session={session} />} />
        <Route path="vendedores" element={<SellersPage view={view} session={session} st={st} />} />
        <Route path="visitantes" element={<VisitorsPage view={view} />} />
        <Route path="vendas" element={<SalesPage view={view} session={session} />} />
        <Route path="resultados" element={<ResultsPage view={view} />} />
        <Route path="*" element={<Navigate to="/empresa" replace />} />
      </Routes>
    </PortalShell>
  );
}

// ---------------------------------------------------------------------------

function BrandLogin({ st }: { st: ExpoState }) {
  const brands = st.brands;
  return (
    <div className="grid-bg min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Logo />
        <h1 className="mt-10 font-display text-5xl font-bold uppercase">Painel da empresa</h1>
        <p className="mt-2 text-zinc-400">Gerencie seu estande, produtos, vendedores e resultados da temporada.</p>
        <div className="mt-6"><Notice tone="amber" title="Login demonstrativo">Neste protótipo você escolhe a conta da marca para entrar. Autenticação real (e-mail/senha, SSO) e regras de acesso no servidor são integrações pendentes. O isolamento de dados por empresa já é aplicado na camada de dados.</Notice></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {brands.map((b) => (
            <button
              key={b.id}
              onClick={() => signIn({ role: 'brand', brandId: b.id, name: b.name })}
              className="card flex items-center gap-3 p-4 text-left transition hover:border-white/20"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl font-display text-lg font-bold" style={{ background: b.booth.primaryColor, color: b.booth.secondaryColor, border: `1px solid ${b.booth.secondaryColor}44` }}>{b.booth.logoText.slice(0, 2)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-white">{b.name}</span>
                <span className="block truncate text-xs text-zinc-500">{b.contactEmail}</span>
              </span>
              <Badge tone={b.status === 'aprovada' ? 'green' : b.status === 'pendente' ? 'amber' : 'red'}>{b.status}</Badge>
            </button>
          ))}
        </div>
        <p className="mt-6 text-sm text-zinc-500">Sua marca ainda não participa? <Link to="/expor" className="text-gold-300 underline">Inscreva-se para a próxima temporada</Link>.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Overview({ view, st }: { view: View; st: ExpoState }) {
  const b = view.brand;
  const s = summarize(view.analytics, view.orders);
  const season = activeSeason(st)!;
  const checklist = [
    { ok: !!b.booth.logoText || !!b.booth.logoImage, t: 'Logotipo definido', to: '/empresa/estande' },
    { ok: view.products.length >= 3, t: 'Pelo menos 3 produtos cadastrados', to: '/empresa/produtos' },
    { ok: view.sellers.some((x) => x.active), t: 'Vendedor ativo cadastrado', to: '/empresa/vendedores' },
    { ok: view.sellers.some((x) => x.shifts.length > 0), t: 'Horários de atendimento definidos', to: '/empresa/vendedores' },
    { ok: b.status === 'aprovada' && !!b.slotId, t: 'Estande aprovado e posicionado no pavilhão', to: '/empresa' },
  ];
  return (
    <>
      <PageTitle eyebrow={season.name} title="Visão geral" actions={<Link to="/empresa/estande" className="btn-gold"><Store size={16} /> Editar estande</Link>}>
        Status da participação: <Badge tone={b.status === 'aprovada' ? 'green' : 'amber'}>{b.status}</Badge> · Plano <b className="text-white">{b.tier}</b> {b.slotId && <>· Estande <b className="text-white">{b.slotId}</b></>}
      </PageTitle>
      {b.status !== 'aprovada' && <div className="mb-6"><Notice title="Inscrição aguardando aprovação">Seu estande só aparece no pavilhão depois que o administrador da plataforma aprovar a inscrição e atribuir uma posição. Você já pode montar o estande e cadastrar produtos.</Notice></div>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Visitantes do estande" value={s.boothVisitors} />
        <Stat label="Produtos vistos" value={s.productViews} />
        <Stat label="Pedidos" value={s.orders} />
        <Stat label="Vendas (bruto)" value={money(s.revenue)} accent />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card overflow-hidden">
          <BoothPreview brand={b} products={view.products} sellers={view.sellers.filter((x) => x.active)} className="h-72 w-full cursor-grab" />
          <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3 text-sm">
            <span className="text-zinc-400">Prévia 3D do seu estande (arraste para girar)</span>
            <Link to={`/feira?estande=${b.id}`} className="text-gold-300">Ver no pavilhão →</Link>
          </div>
        </div>
        <div className="card p-5">
          <p className="eyebrow">Preparação para a temporada</p>
          <ul className="mt-4 space-y-2.5">
            {checklist.map((c) => (
              <li key={c.t}>
                <Link to={c.to} className="flex items-center gap-3 text-sm">
                  <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${c.ok ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/[0.06] text-zinc-500'}`}>{c.ok ? '✓' : ''}</span>
                  <span className={c.ok ? 'text-zinc-300' : 'text-zinc-500'}>{c.t}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

const ARCHS: { value: BoothArchitecture; label: string; desc: string; premium?: boolean }[] = [
  { value: 'ilha', label: 'Ilha', desc: 'Aberto nos 4 lados, torre central com telões e estrutura suspensa.' },
  { value: 'peninsula', label: 'Península', desc: 'Parede de fundo com telão gigante e ala lateral.' },
  { value: 'portal', label: 'Portal', desc: 'Sequência de arcos iluminados e totem de LED.' },
  { value: 'mezanino', label: 'Mezanino', desc: 'Dois pavimentos, lounge VIP e escada.', premium: true },
];

function BoothEditor({ view, session }: { view: View; session: Session }) {
  const b = view.brand;
  const [draft, setDraft] = useState<BoothConfig>(b.booth);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(b.booth);
  const set = <K extends keyof BoothConfig>(k: K, v: BoothConfig[K]) => { setDraft((d) => ({ ...d, [k]: v })); setSaved(false); };
  const canPremium = b.tier !== 'standard';
  const previewBrand: Brand = { ...b, booth: draft };
  const upload = async (key: 'logoImage' | 'screenImage', f?: File | null) => {
    if (!f) return;
    const url = await fileToDataUrl(f, key === 'logoImage' ? 512 : 768);
    set(key, url);
    if (key === 'logoImage') set('logoMode', 'imagem');
  };
  return (
    <>
      <PageTitle eyebrow="Estande" title="Personalizar estande" actions={
        <>
          <button className="btn-ghost" disabled={!dirty} onClick={() => setDraft(b.booth)}>Descartar</button>
          <button className="btn-gold" disabled={!dirty} onClick={() => { brandRepo.updateBooth(session, b.id, draft); setSaved(true); }}><Save size={16} /> Salvar e publicar</button>
        </>
      }>
        As alterações aparecem ao vivo no pavilhão para todos os visitantes conectados assim que você salvar. {saved && <span className="text-emerald-300">Publicado ✓</span>}
      </PageTitle>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-5">
          <section className="card space-y-4 p-5">
            <p className="eyebrow">Arquitetura</p>
            <div className="grid grid-cols-2 gap-2">
              {ARCHS.map((a) => {
                const locked = a.premium && !canPremium;
                return (
                  <button key={a.value} disabled={locked} onClick={() => set('architecture', a.value)} className={`rounded-xl border p-3 text-left transition ${draft.architecture === a.value ? 'border-gold-400/60 bg-gold-400/[0.06]' : 'border-white/10 hover:border-white/20'} ${locked ? 'opacity-50' : ''}`}>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-white">{a.label} {locked && <Lock size={12} />}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{locked ? 'Disponível nos planos Premium e Master.' : a.desc}</p>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Vitrines"><Segmented value={String(draft.vitrineCount)} options={['1', '2', '3', '4'].map((v) => ({ value: v, label: v }))} onChange={(v) => set('vitrineCount', Number(v))} /></Field>
              <Field label="Balcões de atendimento" hint={canPremium ? undefined : '2 balcões: Premium/Master'}><Segmented value={String(draft.counters)} options={[{ value: '1', label: '1' }, ...(canPremium ? [{ value: '2', label: '2' }] : [])]} onChange={(v) => set('counters', Number(v))} /></Field>
            </div>
          </section>

          <section className="card space-y-4 p-5">
            <p className="eyebrow">Identidade e cores</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cor principal"><ColorInput value={draft.primaryColor} onChange={(v) => set('primaryColor', v)} /></Field>
              <Field label="Cor secundária"><ColorInput value={draft.secondaryColor} onChange={(v) => set('secondaryColor', v)} /></Field>
              <Field label="Cor de destaque"><ColorInput value={draft.accentColor} onChange={(v) => set('accentColor', v)} /></Field>
              <Field label="Cor da iluminação"><ColorInput value={draft.lightingColor} onChange={(v) => set('lightingColor', v)} /></Field>
            </div>
            <Field label={`Intensidade da iluminação (${Math.round(draft.lightingIntensity * 100)}%)`}>
              <input type="range" min={0.3} max={1.5} step={0.05} value={draft.lightingIntensity} onChange={(e) => set('lightingIntensity', Number(e.target.value))} className="w-full accent-[#e9c46a]" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Piso"><Segmented value={draft.floor} options={[{ value: 'resina', label: 'Resina' }, { value: 'madeira', label: 'Madeira' }, { value: 'carpete', label: 'Carpete' }]} onChange={(v) => set('floor', v)} /></Field>
              <Field label="Decoração"><select className="input" value={draft.decoration} onChange={(e) => set('decoration', e.target.value as BoothConfig['decoration'])}>
                <option value="minimalista">Minimalista</option><option value="industrial">Industrial (treliças e halteres)</option><option value="natural">Natural (plantas)</option><option value="neon">Neon</option>
              </select></Field>
            </div>
          </section>

          <section className="card space-y-4 p-5">
            <p className="eyebrow">Logotipo</p>
            <Segmented value={draft.logoMode} options={[{ value: 'texto', label: 'Texto' }, { value: 'imagem', label: 'Imagem (PNG/SVG)' }]} onChange={(v) => set('logoMode', v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Texto do logotipo"><input className="input" maxLength={16} value={draft.logoText} onChange={(e) => set('logoText', e.target.value.toUpperCase())} /></Field>
              <Field label="Slogan"><input className="input" maxLength={32} value={draft.tagline} onChange={(e) => set('tagline', e.target.value.toUpperCase())} /></Field>
            </div>
            {draft.logoMode === 'imagem' && (
              <div className="flex items-center gap-3">
                {draft.logoImage && <img src={draft.logoImage} alt="Logotipo" className="h-12 rounded-lg bg-white/5 p-1" />}
                <label className="btn-ghost cursor-pointer"><Upload size={15} /> Enviar imagem<input type="file" accept="image/*" className="hidden" onChange={(e) => upload('logoImage', e.target.files?.[0])} /></label>
              </div>
            )}
            <p className="text-[11px] text-zinc-500">Use somente logotipos que sua empresa tem direito de usar. A imagem fica salva neste navegador (armazenamento de arquivos em nuvem: integração pendente).</p>
          </section>

          <section className="card space-y-4 p-5">
            <p className="eyebrow">Telão de LED</p>
            <Field label="Título"><input className="input" maxLength={40} value={draft.screenHeadline} onChange={(e) => set('screenHeadline', e.target.value)} /></Field>
            <Field label="Subtítulo"><input className="input" maxLength={70} value={draft.screenSubline} onChange={(e) => set('screenSubline', e.target.value)} /></Field>
            <div className="flex items-center gap-3">
              {draft.screenImage && <img src={draft.screenImage} alt="Imagem do telão" className="h-12 rounded-lg" />}
              <label className="btn-ghost cursor-pointer"><Upload size={15} /> Imagem do telão<input type="file" accept="image/*" className="hidden" onChange={(e) => upload('screenImage', e.target.files?.[0])} /></label>
              {draft.screenImage && <button className="text-xs text-zinc-500 hover:text-red-300" onClick={() => set('screenImage', undefined)}>Remover</button>}
            </div>
            <p className="text-[11px] text-zinc-500">O rodapé do telão exibe automaticamente seus produtos e preços. Vídeo no telão: integração pendente.</p>
          </section>
        </div>
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="card overflow-hidden">
            <BoothPreview brand={previewBrand} products={view.products} sellers={view.sellers.filter((s) => s.active)} className="h-[420px] w-full cursor-grab lg:h-[560px]" />
            <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3 text-xs text-zinc-500">
              <span>Prévia ao vivo · arraste para girar</span>
              {dirty ? <Badge tone="amber">Alterações não salvas</Badge> : <Badge tone="green">Publicado</Badge>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

const emptyProduct = (brandId: string): Product => ({
  id: uid('p-'), brandId, name: '', category: 'Proteína', shape: 'pote', color: '#222222', price: 99.9, promoPrice: null, size: '900 g',
  description: '', features: [], inStock: true, isLaunch: false, featured: true,
});

function ProductsPage({ view, session }: { view: View; session: Session }) {
  const [edit, setEdit] = useState<Product | null>(null);
  const [del, setDel] = useState<Product | null>(null);
  const b = view.brand;
  return (
    <>
      <PageTitle eyebrow="Catálogo" title="Produtos" actions={<button className="btn-gold" onClick={() => setEdit(emptyProduct(b.id))}><Plus size={16} /> Novo produto</button>}>
        Produtos marcados como “vitrine” aparecem nas vitrines 3D; lançamentos também vão para a Arena de Lançamentos.
      </PageTitle>
      {view.products.length === 0 ? <Empty title="Nenhum produto cadastrado" /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead><tr><th className="table-head">Produto</th><th className="table-head">Categoria</th><th className="table-head">Preço</th><th className="table-head">Promoção</th><th className="table-head">Status</th><th className="table-head" /></tr></thead>
            <tbody>
              {view.products.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="table-cell"><div className="flex items-center gap-3"><span className="h-8 w-2.5 rounded" style={{ background: p.color, boxShadow: `inset 0 -5px 0 ${b.booth.secondaryColor}` }} /><div><p className="font-medium text-white">{p.name}</p><p className="text-xs text-zinc-500">{p.size} · {p.shape}</p></div></div></td>
                  <td className="table-cell text-zinc-400">{p.category}</td>
                  <td className="table-cell">{money(p.price)}</td>
                  <td className="table-cell">{p.promoPrice ? <span className="text-emerald-300">{money(p.promoPrice)}</span> : <span className="text-zinc-600">—</span>}</td>
                  <td className="table-cell"><div className="flex flex-wrap gap-1">{p.featured && <Badge>Vitrine</Badge>}{p.isLaunch && <Badge tone="gold">Lançamento</Badge>}{!p.inStock && <Badge tone="red">Sem estoque</Badge>}</div></td>
                  <td className="table-cell text-right">
                    <button className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white" onClick={() => setEdit(p)} aria-label="Editar"><Pencil size={15} /></button>
                    <button className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300" onClick={() => setDel(p)} aria-label="Excluir"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && <ProductForm key={edit.id} initial={edit} onClose={() => setEdit(null)} onSave={(p) => { brandRepo.upsertProduct(session, b.id, p); setEdit(null); }} />}
      <Modal open={!!del} onClose={() => setDel(null)} title="Excluir produto">
        <p className="text-sm text-zinc-300">Excluir <b>{del?.name}</b>? Ele sai das vitrines e do catálogo imediatamente.</p>
        <div className="mt-5 flex justify-end gap-2"><button className="btn-ghost" onClick={() => setDel(null)}>Cancelar</button><button className="btn-danger" onClick={() => { if (del) brandRepo.deleteProduct(session, b.id, del.id); setDel(null); }}>Excluir</button></div>
      </Modal>
    </>
  );
}

function ProductForm({ initial, onClose, onSave }: { initial: Product; onClose: () => void; onSave: (p: Product) => void }) {
  const [p, setP] = useState(initial);
  const [features, setFeatures] = useState(initial.features.join('\n'));
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }));
  const valid = p.name.trim().length > 1 && p.price > 0 && (p.promoPrice == null || p.promoPrice < p.price);
  return (
    <Modal open onClose={onClose} title={initial.name ? 'Editar produto' : 'Novo produto'}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (valid) onSave({ ...p, name: p.name.trim(), features: features.split('\n').map((s) => s.trim()).filter(Boolean) }); }}>
        <Field label="Nome"><input className="input" required value={p.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria"><input className="input" value={p.category} onChange={(e) => set('category', e.target.value)} /></Field>
          <Field label="Tamanho / conteúdo"><input className="input" value={p.size} onChange={(e) => set('size', e.target.value)} /></Field>
          <Field label="Embalagem 3D"><select className="input" value={p.shape} onChange={(e) => set('shape', e.target.value as Product['shape'])}><option value="pote">Pote</option><option value="garrafa">Frasco/garrafa</option><option value="caixa">Caixa</option><option value="refil">Refil</option><option value="shaker">Coqueteleira</option></select></Field>
          <Field label="Cor da embalagem"><ColorInput value={p.color} onChange={(v) => set('color', v)} /></Field>
          <Field label="Preço (R$)"><input className="input" type="number" step="0.01" min="0.01" value={p.price} onChange={(e) => set('price', Number(e.target.value))} /></Field>
          <Field label="Preço promocional (opcional)"><input className="input" type="number" step="0.01" min="0" value={p.promoPrice ?? ''} onChange={(e) => set('promoPrice', e.target.value ? Number(e.target.value) : null)} /></Field>
        </div>
        {p.promoPrice != null && p.promoPrice >= p.price && <p className="text-xs text-red-300">O preço promocional deve ser menor que o preço normal.</p>}
        <Field label="Descrição"><textarea className="input min-h-[80px]" value={p.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <Field label="Características (uma por linha)"><textarea className="input min-h-[80px]" value={features} onChange={(e) => setFeatures(e.target.value)} /></Field>
        <div className="flex flex-wrap gap-4 text-sm">
          {([['featured', 'Exibir nas vitrines'], ['isLaunch', 'Lançamento'], ['inStock', 'Em estoque']] as const).map(([k, l]) => (
            <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={p[k]} onChange={(e) => set(k, e.target.checked)} className="accent-[#e9c46a]" /> {l}</label>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-gold" disabled={!valid}>Salvar produto</button></div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

const SKIN = ['#f1c7a5', '#e0b08f', '#d39c7b', '#c68e6a', '#a26b4a', '#8d5a3b', '#7b4b32', '#5a3624'];
const HAIRC = ['#0d0d0d', '#1e1712', '#2a1b10', '#4a2c1a', '#7a5230', '#b88a4a', '#d8c08a', '#8a8a8a'];

function SellersPage({ view, session, st }: { view: View; session: Session; st: ExpoState }) {
  const b = view.brand;
  const [edit, setEdit] = useState<Seller | null>(null);
  const days = seasonDays(activeSeason(st)!);
  const newSeller = (): Seller => ({
    id: uid('s-'), brandId: b.id, name: '', title: 'Consultor(a)', languages: ['Português'], bio: '', active: true, shifts: [{ day: 1, start: '10:00', end: '16:00' }],
    avatar: { body: 'masculino', skin: '#c68e6a', hair: 'curto', hairColor: '#1e1712', outfit: 'polo', outfitColor: b.booth.secondaryColor, pantsColor: '#1c1f26', height: 1.76, build: 'atletico', accessory: 'nenhum' },
  });
  const navigate = useNavigate();
  const openAsSeller = (s: Seller) => {
    // Abre em nova aba quando o navegador permite; senão, na mesma aba.
    let w: Window | null = null;
    try { w = window.open(`${location.pathname}#/feira?modo=vendedor&vendedor=${s.id}`, '_blank'); } catch { w = null; }
    if (!w) navigate(`/feira?modo=vendedor&vendedor=${s.id}`);
  };
  return (
    <>
      <PageTitle eyebrow="Atendimento humano" title="Vendedores" actions={<button className="btn-gold" onClick={() => setEdit(newSeller())}><Plus size={16} /> Novo vendedor</button>}>
        Cada vendedor é uma pessoa real que controla seu avatar e atende visitantes por voz. Não há atendimento por inteligência artificial.
      </PageTitle>
      <div className="mb-5"><Notice tone="blue" title="Como funciona o plantão">
        Clique em <b>Entrar na feira como vendedor</b>: uma nova aba abre com o seu avatar no estande. Visitantes que estiverem no pavilhão
        (no mesmo navegador, neste protótipo) verão você online e poderão iniciar uma conversa por voz. Para atendimento entre computadores
        diferentes é necessário o servidor de tempo real — <b>integração pendente</b>.
      </Notice></div>
      {view.sellers.length === 0 ? <Empty title="Nenhum vendedor cadastrado" /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {view.sellers.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg font-bold" style={{ background: s.avatar.outfitColor, color: '#fff' }}><UserRound size={22} /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">{s.name} {!s.active && <Badge tone="red">inativo</Badge>}</p>
                  <p className="text-xs text-zinc-500">{s.title} · {s.languages.join(', ')}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.shifts.length === 0 && <span className="text-xs text-zinc-500">Sem horários definidos</span>}
                    {s.shifts.map((sh, i) => <Badge key={i}>Dia {sh.day} · {sh.start}–{sh.end}</Badge>)}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn-gold flex-1 py-2 text-xs" disabled={!s.active || b.status !== 'aprovada' || !b.slotId} onClick={() => openAsSeller(s)}><ExternalLink size={14} /> Entrar na feira como vendedor</button>
                <button className="btn-ghost py-2 text-xs" onClick={() => setEdit(s)}><Pencil size={14} /> Editar</button>
                <button className="btn-ghost py-2 text-xs text-zinc-400" onClick={() => brandRepo.deleteSeller(session, b.id, s.id)} aria-label="Remover"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {edit && <SellerForm key={edit.id} initial={edit} days={days} logo={b.booth.logoText} onClose={() => setEdit(null)} onSave={(s) => { brandRepo.upsertSeller(session, b.id, s); setEdit(null); }} />}
    </>
  );
}

function SellerForm({ initial, days, logo, onClose, onSave }: { initial: Seller; days: number; logo: string; onClose: () => void; onSave: (s: Seller) => void }) {
  const [s, setS] = useState(initial);
  const set = <K extends keyof Seller>(k: K, v: Seller[K]) => setS((x) => ({ ...x, [k]: v }));
  const av = <K extends keyof AvatarConfig>(k: K, v: AvatarConfig[K]) => setS((x) => ({ ...x, avatar: { ...x.avatar, [k]: v } }));
  const setShift = (i: number, patch: Partial<Shift>) => set('shifts', s.shifts.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const shiftsValid = s.shifts.every((x) => x.start < x.end);
  return (
    <Modal open onClose={onClose} wide title={initial.name ? `Editar ${initial.name}` : 'Novo vendedor'}>
      <div className="grid gap-5 md:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome"><input className="input" value={s.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Cargo"><input className="input" value={s.title} onChange={(e) => set('title', e.target.value)} /></Field>
            <Field label="Idiomas (separados por vírgula)"><input className="input" value={s.languages.join(', ')} onChange={(e) => set('languages', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} /></Field>
            <Field label="Status"><Segmented value={s.active ? 'a' : 'i'} options={[{ value: 'a', label: 'Ativo' }, { value: 'i', label: 'Inativo' }]} onChange={(v) => set('active', v === 'a')} /></Field>
          </div>
          <Field label="Apresentação"><textarea className="input min-h-[60px]" value={s.bio} onChange={(e) => set('bio', e.target.value)} /></Field>

          <div className="rounded-2xl border border-white/[0.06] p-4">
            <p className="eyebrow mb-3">Avatar</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Corpo"><Segmented value={s.avatar.body} options={[{ value: 'masculino', label: 'Masculino' }, { value: 'feminino', label: 'Feminino' }]} onChange={(v) => av('body', v)} /></Field>
              <Field label="Porte"><Segmented value={s.avatar.build} options={[{ value: 'medio', label: 'Médio' }, { value: 'atletico', label: 'Atlético' }, { value: 'forte', label: 'Forte' }]} onChange={(v) => av('build', v)} /></Field>
            </div>
            <div className="mt-3"><span className="label">Tom de pele</span><div className="flex flex-wrap gap-2">{SKIN.map((c) => <button key={c} onClick={() => av('skin', c)} className={`h-8 w-8 rounded-full border-2 ${s.avatar.skin === c ? 'border-gold-400' : 'border-transparent'}`} style={{ background: c }} aria-label={c} />)}</div></div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Cabelo"><select className="input" value={s.avatar.hair} onChange={(e) => av('hair', e.target.value as AvatarConfig['hair'])}><option value="curto">Curto</option><option value="raspado">Raspado</option><option value="coque">Coque</option><option value="longo">Longo</option><option value="cacheado">Cacheado</option></select></Field>
              <Field label="Acessório"><select className="input" value={s.avatar.accessory} onChange={(e) => av('accessory', e.target.value as AvatarConfig['accessory'])}><option value="nenhum">Nenhum</option><option value="oculos">Óculos</option><option value="headset">Headset</option></select></Field>
            </div>
            <div className="mt-3"><span className="label">Cor do cabelo</span><div className="flex flex-wrap gap-2">{HAIRC.map((c) => <button key={c} onClick={() => av('hairColor', c)} className={`h-7 w-7 rounded-full border-2 ${s.avatar.hairColor === c ? 'border-gold-400' : 'border-transparent'}`} style={{ background: c }} aria-label={c} />)}</div></div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Uniforme"><select className="input" value={s.avatar.outfit} onChange={(e) => av('outfit', e.target.value as AvatarConfig['outfit'])}><option value="polo">Polo</option><option value="jaqueta">Jaqueta</option><option value="regata">Regata</option></select></Field>
              <Field label="Cor do uniforme"><ColorInput value={s.avatar.outfitColor} onChange={(v) => av('outfitColor', v)} /></Field>
              <Field label="Cor da calça"><ColorInput value={s.avatar.pantsColor} onChange={(v) => av('pantsColor', v)} /></Field>
              <Field label={`Altura (${s.avatar.height.toFixed(2)} m)`}><input type="range" min={1.5} max={2.0} step={0.01} value={s.avatar.height} onChange={(e) => av('height', Number(e.target.value))} className="w-full accent-[#e9c46a]" /></Field>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] p-4">
            <div className="mb-3 flex items-center justify-between"><p className="eyebrow">Horários de atendimento</p><button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => set('shifts', [...s.shifts, { day: 1, start: '10:00', end: '14:00' }])}><Plus size={13} /> Turno</button></div>
            <div className="space-y-2">
              {s.shifts.map((sh, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select className="input w-28" value={sh.day} onChange={(e) => setShift(i, { day: Number(e.target.value) })}>{Array.from({ length: days }).map((_, d) => <option key={d} value={d + 1}>Dia {d + 1}</option>)}</select>
                  <input type="time" className="input" value={sh.start} onChange={(e) => setShift(i, { start: e.target.value })} />
                  <span className="text-zinc-500">–</span>
                  <input type="time" className="input" value={sh.end} onChange={(e) => setShift(i, { end: e.target.value })} />
                  <button className="p-2 text-zinc-500 hover:text-red-300" onClick={() => set('shifts', s.shifts.filter((_, j) => j !== i))} aria-label="Remover turno"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            {!shiftsValid && <p className="mt-2 text-xs text-red-300">O horário final deve ser depois do inicial.</p>}
          </div>
        </div>
        <div className="md:sticky md:top-20 md:self-start">
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-950">
            <AvatarPreview config={s.avatar} name={s.name} logo={logo} className="h-[380px] w-full cursor-grab" />
          </div>
          <p className="mt-2 text-center text-xs text-zinc-500">Prévia do avatar · arraste para girar</p>
          <button className="btn-gold mt-4 w-full" disabled={s.name.trim().length < 2 || !shiftsValid} onClick={() => onSave({ ...s, name: s.name.trim() })}><Save size={16} /> Salvar vendedor</button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function DemoNote({ show }: { show: boolean }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
      <IntegrationTag kind="local" /> Dados registrados neste navegador. {show && <Badge tone="amber">Inclui dados de demonstração gerados pelo administrador</Badge>}
    </div>
  );
}

function VisitorsPage({ view }: { view: View }) {
  const s = summarize(view.analytics, view.orders);
  const recent = [...view.analytics].sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 60);
  return (
    <>
      <PageTitle eyebrow="Público" title="Visitantes">Interações de visitantes com o seu estande. Identificação anônima (sem dados pessoais) até a compra.</PageTitle>
      <DemoNote show={s.hasDemo} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Visitantes únicos" value={s.boothVisitors} />
        <Stat label="Visualizações de produto" value={s.productViews} />
        <Stat label="Pedidos de atendimento" value={s.callRequests} hint={`${s.callsConnected} conversas conectadas`} />
        <Stat label="Adições ao carrinho" value={s.cartAdds} />
      </div>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead><tr><th className="table-head">Visitante</th><th className="table-head">Ação</th><th className="table-head">Produto</th><th className="table-head">Quando</th></tr></thead>
          <tbody>
            {recent.length === 0 && <tr><td colSpan={4} className="table-cell py-8 text-center text-zinc-500">Nenhuma visita registrada ainda. Visite o seu estande no pavilhão 3D.</td></tr>}
            {recent.map((a) => (
              <tr key={a.id}>
                <td className="table-cell font-mono text-xs text-zinc-400">#{shortId(a.visitorId)} {a.isDemo && <Badge tone="amber">demo</Badge>}</td>
                <td className="table-cell">{analyticsLabel[a.type]}</td>
                <td className="table-cell text-zinc-400">{a.productId ? view.products.find((p) => p.id === a.productId)?.name ?? '—' : '—'}</td>
                <td className="table-cell text-zinc-500">{fmtDateTime(a.ts)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SalesPage({ view, session }: { view: View; session: Session }) {
  const [open, setOpen] = useState<Order | null>(null);
  const orders = [...view.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const s = summarize(view.analytics, view.orders);
  const statuses: OrderStatus[] = ['aguardando_marca', 'confirmado', 'enviado', 'entregue', 'cancelado'];
  return (
    <>
      <PageTitle eyebrow="Comércio" title="Vendas">Pedidos feitos na feira para a sua marca. Pagamento, estoque e entrega são de responsabilidade da marca.</PageTitle>
      <div className="mb-5 space-y-2">
        <Notice title="Pagamentos simulados">Nenhuma cobrança real foi feita. Integrações pendentes: gateway de pagamento com repasse (split) para a marca e envio automático do pedido ao sistema da marca (ERP/e-commerce).</Notice>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pedidos" value={s.orders} />
        <Stat label="Vendas (bruto)" value={money(s.revenue)} accent />
        <Stat label="Comissão da plataforma" value={money(s.commission)} />
        <Stat label="Ticket médio" value={money(s.avgTicket)} />
      </div>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead><tr><th className="table-head">Pedido</th><th className="table-head">Cliente</th><th className="table-head">Itens</th><th className="table-head">Total</th><th className="table-head">Comissão</th><th className="table-head">Status</th></tr></thead>
          <tbody>
            {orders.length === 0 && <tr><td colSpan={6} className="table-cell py-8 text-center text-zinc-500">Nenhum pedido ainda.</td></tr>}
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-white/[0.02]">
                <td className="table-cell"><button className="font-mono text-xs text-gold-300 underline-offset-2 hover:underline" onClick={() => setOpen(o)}>{o.code}</button> {o.isDemo && <Badge tone="amber">demo</Badge>}<p className="text-[11px] text-zinc-500">{fmtDateTime(o.createdAt)}</p></td>
                <td className="table-cell">{o.customer.name}<p className="text-[11px] text-zinc-500">{o.customer.city}</p></td>
                <td className="table-cell text-zinc-400">{o.lines.reduce((a, l) => a + l.qty, 0)} un.</td>
                <td className="table-cell font-semibold">{money(o.total)}</td>
                <td className="table-cell text-zinc-400">{money(o.commissionValue)} <span className="text-[11px]">({pct(o.commissionRate)})</span></td>
                <td className="table-cell">
                  <select className="input py-1.5 text-xs" value={o.status} onChange={(e) => brandRepo.updateOrderStatus(session, view.brand.id, o.id, e.target.value as OrderStatus)}>
                    {statuses.map((x) => <option key={x} value={x}>{orderStatusLabel[x]}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={!!open} onClose={() => setOpen(null)} title={`Pedido ${open?.code}`}>
        {open && (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl bg-white/[0.03] p-3">
              <p className="font-semibold">{open.customer.name}</p>
              <p className="text-zinc-400">{open.customer.email} · {open.customer.phone}</p>
              <p className="text-zinc-400">{open.customer.address} · {open.customer.city} · CEP {open.customer.cep}</p>
            </div>
            {open.lines.map((l) => <div key={l.productId} className="flex justify-between"><span>{l.qty}× {l.name}</span><span>{money(l.unitPrice * l.qty)}</span></div>)}
            <div className="space-y-1 border-t border-white/10 pt-3 text-zinc-400">
              <div className="flex justify-between"><span>Subtotal</span><span>{money(open.subtotal)}</span></div>
              <div className="flex justify-between"><span>Frete</span><span>{money(open.shipping)}</span></div>
              <div className="flex justify-between font-semibold text-white"><span>Total</span><span>{money(open.total)}</span></div>
              <div className="flex justify-between"><span>Comissão da plataforma ({pct(open.commissionRate)})</span><span>− {money(open.commissionValue)}</span></div>
              <div className="flex justify-between text-emerald-300"><span>Líquido para a marca</span><span>{money(open.total - open.commissionValue)}</span></div>
            </div>
            <p className="flex items-center gap-2 text-xs text-zinc-500"><IntegrationTag kind="simulado" /> Pagamento via {open.paymentMethod} simulado.</p>
          </div>
        )}
      </Modal>
    </>
  );
}

function ResultsPage({ view }: { view: View }) {
  const s = summarize(view.analytics, view.orders);
  const daily = useMemo(() => byDay(view.orders.filter((o) => o.status !== 'cancelado'), (o) => o.createdAt, (o) => o.total, 7), [view.orders]);
  const top = topProducts(view.orders);
  return (
    <>
      <PageTitle eyebrow="Temporada" title="Resultados">Desempenho do estande na temporada atual.</PageTitle>
      <DemoNote show={s.hasDemo} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Faturamento" value={money(s.revenue)} accent />
        <Stat label="Pedidos" value={s.orders} />
        <Stat label="Conversão visitante → comprador" value={pct(s.conversion)} />
        <Stat label="Líquido (após comissão)" value={money(s.revenue - s.commission)} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <p className="mb-4 text-sm font-semibold">Vendas por dia (R$) — últimos 7 dias</p>
          <BarChart data={daily} label="Vendas por dia" format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0))} />
        </div>
        <div className="card p-5">
          <p className="mb-4 text-sm font-semibold">Funil do estande (visitantes únicos)</p>
          <Funnel steps={[
            { label: 'Visitaram o estande', value: s.boothVisitors },
            { label: 'Viram produtos', value: s.productViewers },
            { label: 'Adicionaram ao carrinho', value: s.cartUsers },
            { label: 'Compraram', value: s.buyers },
          ]} />
        </div>
      </div>
      <div className="card mt-4 overflow-x-auto">
        <p className="px-4 pt-4 text-sm font-semibold">Produtos mais vendidos</p>
        <table className="mt-2 w-full min-w-[480px]">
          <thead><tr><th className="table-head">Produto</th><th className="table-head">Unidades</th><th className="table-head">Faturamento</th></tr></thead>
          <tbody>
            {top.length === 0 && <tr><td colSpan={3} className="table-cell py-6 text-center text-zinc-500">Sem vendas ainda.</td></tr>}
            {top.map((t) => <tr key={t.name}><td className="table-cell">{t.name}</td><td className="table-cell">{t.qty}</td><td className="table-cell">{money(t.revenue)}</td></tr>)}
          </tbody>
        </table>
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-zinc-500"><Boxes size={13} /> Exportação de relatórios (CSV/BI): integração pendente.</p>
    </>
  );
}
