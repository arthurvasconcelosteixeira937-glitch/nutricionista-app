import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, CalendarDays, Gauge, HelpCircle, Map as MapIcon, Mic, MousePointer2, PhoneIncoming, ShoppingBag, Store, X,
} from 'lucide-react';
import { getState, useExpo } from '@/data/store';
import { track } from '@/data/repositories';
import type { Product, Seller } from '@/domain/types';
import { getSession, getVisitor, setVisitorName, useSession } from '@/services/auth';
import { cartActions, useCart } from '@/services/commerce';
import { LocalBroadcastTransport, type PresenceState } from '@/services/realtime/transport';
import { VoiceCall, type CallState } from '@/services/voice/voice';
import { activeSeason, phaseLabel, seasonStatus } from '@/services/season';
import { fmtDateTime, fmtTime } from '@/lib/util';
import { Badge, IntegrationTag, Logo } from '@/components/ui';
import { HallMap } from '@/components/HallMap';
import { ExpoEngine, visitorAvatar, type Quality, type Target } from './engine/ExpoEngine';
import { SLOTS } from './engine/layout';
import { BoothPanel, CartDrawer, DirectoryModal, Price, ProductModal, ScheduleModal } from './hud/Panels';
import { VoicePanel, type ChatLine } from './hud/VoicePanel';
import type { HallData } from './engine/hall';

function autoQuality(): Quality {
  try {
    const saved = localStorage.getItem('fwe:quality') as Quality | null;
    if (saved) return saved;
  } catch { /* ignora */ }
  const touch = matchMedia('(pointer: coarse)').matches;
  return touch || window.innerWidth < 900 ? 'baixa' : 'alta';
}

function shiftLabelFor(s: Seller, day: number | null) {
  if (!day) return 'Fora do período da temporada';
  const today = s.shifts.filter((x) => x.day === day);
  if (!today.length) return 'Sem plantão hoje';
  return `Plantão hoje ${today.map((x) => `${x.start}–${x.end}`).join(', ')}`;
}

export default function ExpoPage() {
  const st = useExpo();
  const stRef = useRef(st);
  stRef.current = st;
  const session = useSession();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const cart = useCart();
  const cartCount = cart.reduce((a, b) => a + b.qty, 0);

  // modo vendedor
  const sellerId = params.get('modo') === 'vendedor' ? params.get('vendedor') : null;
  const selfSeller = sellerId ? st.sellers.find((s) => s.id === sellerId) : undefined;
  const sellerAllowed = !!selfSeller && session?.role === 'brand' && session.brandId === selfSeller.brandId;
  const role: 'visitor' | 'seller' = sellerId && sellerAllowed ? 'seller' : 'visitor';

  const [quality, setQuality] = useState<Quality>(autoQuality);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ExpoEngine | null>(null);
  const transportRef = useRef<LocalBroadcastTransport | null>(null);
  const callRef = useRef<VoiceCall | null>(null);
  const [ready, setReady] = useState(false);
  const [entered, setEntered] = useState(false);
  const [locked, setLocked] = useState(false);
  const [hover, setHover] = useState<Target | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [nearSeller, setNearSeller] = useState<string | null>(null);
  const [pose, setPose] = useState<{ x: number; z: number; yaw: number } | null>(null);
  const [peers, setPeers] = useState<PresenceState[]>([]);
  const [fps, setFps] = useState(0);
  const [visitorName, setVName] = useState(() => getVisitor().name);

  const [productId, setProductId] = useState<string | null>(null);
  const [boothId, setBoothId] = useState<string | null>(null);
  const [showDir, setShowDir] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showMap, setShowMap] = useState(() => window.innerWidth >= 1024);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);

  const [callState, setCallState] = useState<CallState>('idle');
  const [callInfo, setCallInfo] = useState('');
  const [callPeer, setCallPeer] = useState<{ name: string; sub: string; sellerId?: string } | null>(null);
  const [chat, setChat] = useState<ChatLine[]>([]);

  const season = activeSeason(st)!;
  const sstatus = seasonStatus(season);
  const visitor = useMemo(() => getVisitor(), []);
  const visitedBooths = useRef(new Set<string>());

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const anyModal = !!productId || !!boothId || showDir || showSchedule || showCart || showHelp || !entered || callState === 'incoming';

  // ---------- Motor 3D ----------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let disposed = false;
    const hallData: HallData = {
      seasonLabel: `TEMPORADA ${String(season.number).padStart(2, '0')}`,
      seasonTheme: season.theme,
      namingSponsor: st.sponsors.find((s) => s.seasonId === season.id && s.tier === 'diamante' && s.contractStatus === 'assinado')?.name ?? null,
      sponsors: () => stRef.current.sponsors.filter((s) => s.seasonId === stRef.current.activeSeasonId && s.contractStatus !== 'cancelado').map((s) => ({ name: s.name, tier: s.tier })),
      ad: (loc) => {
        const a = stRef.current.monetization.adSlots.find((x) => x.location === loc && x.active);
        return a ? { advertiser: a.advertiser, message: a.message, slotName: a.name } : null;
      },
      directory: () => {
        const s = stRef.current;
        const row = (side: 'esquerda' | 'direita') =>
          SLOTS.filter((x) => x.side === side).map((slot) => {
            const b = s.brands.find((x) => x.slotId === slot.id && x.status === 'aprovada');
            return { slot: slot.id, name: b?.name ?? 'Disponível', color: b?.booth.secondaryColor ?? '#555' };
          });
        return { left: row('esquerda'), right: row('direita') };
      },
      stage: () => {
        const s = stRef.current;
        const now = Date.now();
        const evs = s.events.filter((e) => e.seasonId === s.activeSeasonId && (e.location.toLowerCase().includes('palco') || e.location.toLowerCase().includes('arena')));
        const live = evs.find((e) => new Date(e.start).getTime() <= now && new Date(e.end).getTime() >= now);
        const next = evs.filter((e) => new Date(e.start).getTime() > now).sort((a, b) => a.start.localeCompare(b.start))[0];
        const sponsor = s.sponsors.find((x) => x.seasonId === s.activeSeasonId && x.tier === 'diamante' && x.contractStatus === 'assinado')?.name ?? null;
        const adSlot = s.monetization.adSlots.find((x) => x.location === 'palco' && x.active);
        const ad = adSlot ? { advertiser: adSlot.advertiser, message: adSlot.message } : null;
        if (live) return { label: 'AO VIVO', title: live.title, when: `Até ${fmtTime(live.end)} · ${live.location}`, sponsor, ad };
        if (next) return { label: 'A SEGUIR', title: next.title, when: fmtDateTime(next.start), sponsor, ad };
        return { label: 'PROGRAMAÇÃO', title: 'Confira a agenda da próxima temporada', when: '', sponsor, ad };
      },
    };

    const start = async () => {
      // aguarda as fontes para os letreiros
      await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1800))]);
      if (disposed) return;
      const engine = new ExpoEngine(el, {
        quality,
        role,
        selfSellerId: role === 'seller' ? sellerId! : undefined,
        hallData,
        callbacks: {
          onHover: setHover,
          onInteract: (t) => handleInteract.current(t),
          onZone: (z) => {
            setZone(z);
            if (z && !visitedBooths.current.has(z) && role === 'visitor') {
              visitedBooths.current.add(z);
              track('visita_estande', visitor.id, { brandId: z });
            }
          },
          onNearbySeller: setNearSeller,
          onPose: (p) => {
            setPose({ x: p.x, z: p.z, yaw: p.yaw });
            transportRef.current?.updatePresence({ x: p.x, z: p.z, ry: p.yaw, moving: p.moving });
          },
          onLockChange: setLocked,
          onFps: setFps,
        },
      });
      engine.syncState(stRef.current);
      if (role === 'seller' && sellerId) engine.spawnAtSeller(sellerId);
      engineRef.current = engine;
      if (import.meta.env.DEV) (window as unknown as { __fwe: ExpoEngine }).__fwe = engine;
      setReady(true);
    };
    start();
    return () => {
      disposed = true;
      engineRef.current?.dispose();
      engineRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality, role, sellerId]);

  // estado → mundo 3D (estandes, produtos, vendedores)
  useEffect(() => {
    engineRef.current?.syncState(st);
    const map = new Map<string, string>();
    st.sellers.forEach((s) => map.set(s.id, shiftLabelFor(s, sstatus.day).replace('Plantão hoje ', 'HOJE ')));
    engineRef.current?.setSellerLabels(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st, ready]);

  // bloqueia o movimento enquanto há janelas abertas
  useEffect(() => {
    engineRef.current?.setInputEnabled(!anyModal);
  }, [anyModal, ready]);

  // ---------- Tempo real + voz ----------
  useEffect(() => {
    if (!entered) return;
    const tr = new LocalBroadcastTransport();
    transportRef.current = tr;
    const me = role === 'seller' && selfSeller
      ? { role: 'seller' as const, name: selfSeller.name, brandId: selfSeller.brandId, sellerId: selfSeller.id, avatar: selfSeller.avatar }
      : { role: 'visitor' as const, name: visitorName, avatar: visitorAvatar(visitor.id) };
    const p = engineRef.current?.pose() ?? { x: 0, z: 18, yaw: 0 };
    tr.connect({ ...me, x: p.x, z: p.z, ry: p.yaw, moving: false, talking: false, inCallWith: null });
    const off = tr.onPeers((list) => {
      setPeers(list);
      engineRef.current?.setPeers(list);
    });
    const call = new VoiceCall(tr);
    callRef.current = call;
    call.on('state', (s, info) => {
      setCallState(s);
      setCallInfo(info ?? '');
      if (s === 'incoming') {
        const vp = tr.peers().find((x) => x.peerId === call.peerId);
        setCallPeer({ name: info || vp?.name || 'Visitante', sub: 'Visitante da feira' });
        setChat([]);
      }
      if (s === 'connected') {
        tr.updatePresence({ inCallWith: call.peerId, talking: true });
        if (role === 'visitor') track('chamada_conectada', visitor.id, { brandId: callPeerRef.current?.brandId, sellerId: callPeerRef.current?.sellerId });
      }
      if (s === 'ended' || s === 'error' || s === 'idle') {
        tr.updatePresence({ inCallWith: null, talking: false });
        engineRef.current?.setTalking(null);
      }
    });
    call.on('chat', (from, text) => setChat((c) => [...c, { from, text }]));
    if (role === 'visitor') track('sessao', visitor.id);
    return () => {
      off();
      call.dispose();
      tr.disconnect();
      callRef.current = null;
      transportRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entered, role]);

  const callPeerRef = useRef<{ brandId?: string; sellerId?: string } | null>(null);

  const onlineIds = useMemo(() => new Set(peers.filter((p) => p.role === 'seller' && p.sellerId).map((p) => p.sellerId!)), [peers]);

  const startCall = useCallback((s: Seller) => {
    const call = callRef.current;
    const peer = transportRef.current?.peers().find((p) => p.role === 'seller' && p.sellerId === s.id);
    if (!call) return;
    if (!peer) {
      toast(`${s.name} não está online agora.`);
      return;
    }
    if (peer.inCallWith) {
      toast(`${s.name} está em outro atendimento. Tente novamente em instantes.`);
      return;
    }
    const brand = stRef.current.brands.find((b) => b.id === s.brandId);
    setCallPeer({ name: s.name, sub: `${s.title} · ${brand?.name ?? ''}`, sellerId: s.id });
    callPeerRef.current = { brandId: s.brandId, sellerId: s.id };
    setChat([]);
    setProductId(null);
    setBoothId(null);
    engineRef.current?.setTalking(s.id);
    track('chamada_solicitada', visitor.id, { brandId: s.brandId, sellerId: s.id });
    call.call(peer.peerId, { visitorName: visitorName, brandId: s.brandId, sellerId: s.id });
  }, [toast, visitor.id, visitorName]);

  // ---------- Interações ----------
  const handleInteract = useRef<(t: Target) => void>(() => undefined);
  handleInteract.current = (t: Target) => {
    engineRef.current?.input.exitLock();
    if (t.kind === 'product') {
      setProductId(t.productId);
      if (role === 'visitor') track('produto_visto', visitor.id, { brandId: t.brandId, productId: t.productId });
    } else if (t.kind === 'screen') setBoothId(t.brandId);
    else if (t.kind === 'stage') setShowSchedule(true);
    else if (t.kind === 'directory') setShowDir(true);
    else if (t.kind === 'seller') {
      const s = stRef.current.sellers.find((x) => x.id === t.sellerId);
      if (!s) return;
      if (role === 'seller') return;
      if (onlineIds.has(s.id)) startCall(s);
      else setBoothId(s.brandId);
    }
  };

  // chegada via ?estande=
  useEffect(() => {
    const target = params.get('estande');
    if (entered && target && engineRef.current) setTimeout(() => engineRef.current?.goToBooth(target, stRef.current), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entered]);

  const enter = () => {
    if (role === 'visitor') setVisitorName(visitorName);
    setEntered(true);
    setTimeout(() => engineRef.current?.input.requestLock(), 50);
  };

  const product = productId ? st.products.find((p) => p.id === productId) ?? null : null;
  const productBrand = product ? st.brands.find((b) => b.id === product.brandId) : undefined;
  const zoneBrand = zone ? st.brands.find((b) => b.id === zone) : undefined;
  const nearSellerObj = nearSeller ? st.sellers.find((s) => s.id === nearSeller) : undefined;
  const callActive = callState !== 'idle' && callState !== 'incoming';
  const onlineSellerDots = peers.filter((p) => p.role === 'seller').map((p) => ({ x: p.x, z: p.z, brandId: p.brandId }));
  const hoverLabel = (() => {
    if (!hover) return null;
    if (hover.kind === 'product') {
      const p = st.products.find((x) => x.id === hover.productId);
      return p ? { t: p.name, s: <Price p={p} />, a: 'Ver produto' } : null;
    }
    if (hover.kind === 'seller') {
      const s = st.sellers.find((x) => x.id === hover.sellerId);
      if (!s) return null;
      return { t: s.name, s: <span className="text-xs text-zinc-400">{s.title}</span>, a: onlineIds.has(s.id) ? 'Falar por voz' : 'Ver horários' };
    }
    if (hover.kind === 'screen') return { t: st.brands.find((b) => b.id === hover.brandId)?.name ?? 'Estande', s: <span className="text-xs text-zinc-400">Catálogo e atendimento</span>, a: 'Abrir estande' };
    if (hover.kind === 'stage') return { t: 'Palco Principal', s: <span className="text-xs text-zinc-400">Apresentações e lançamentos</span>, a: 'Ver programação' };
    return { t: 'Diretório', s: <span className="text-xs text-zinc-400">Mapa e expositores</span>, a: 'Abrir diretório' };
  })();

  const isTouch = engineRef.current?.input.isTouch ?? matchMedia('(pointer: coarse)').matches;

  if (sellerId && !sellerAllowed) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-950 p-6">
        <div className="card max-w-md p-8 text-center">
          <p className="eyebrow">Modo vendedor</p>
          <h1 className="mt-3 font-display text-3xl font-bold uppercase">Acesso restrito</h1>
          <p className="mt-3 text-sm text-zinc-400">Para atender como vendedor, entre no Painel da Empresa com a conta da marca e use “Entrar na feira como vendedor”.</p>
          <div className="mt-6 flex justify-center gap-2">
            <Link className="btn-gold" to="/empresa/vendedores">Ir para o painel</Link>
            <Link className="btn-ghost" to="/feira">Entrar como visitante</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-ink-950">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Carregamento */}
      {!ready && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-ink-950">
          <div className="flex flex-col items-center gap-5">
            <Logo />
            <div className="h-1 w-56 overflow-hidden rounded-full bg-white/10"><div className="h-full w-1/2 animate-pulse rounded-full bg-gold-400" /></div>
            <p className="text-sm text-zinc-500">Montando o pavilhão…</p>
          </div>
        </div>
      )}

      {/* Portão de entrada */}
      {ready && !entered && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-gradient-to-b from-black/70 via-black/50 to-black/80 p-4 backdrop-blur-[2px]">
          <div className="glass fade-up w-full max-w-lg rounded-3xl p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <p className="eyebrow">{season.name}</p>
              <Badge tone={sstatus.phase === 'aberta' ? 'green' : 'zinc'}>{phaseLabel[sstatus.phase]}</Badge>
            </div>
            {role === 'seller' && selfSeller ? (
              <>
                <h1 className="mt-4 font-display text-4xl font-bold uppercase leading-none">Plantão de atendimento</h1>
                <p className="mt-3 text-sm text-zinc-300">
                  Você entrará como <b className="text-white">{selfSeller.name}</b> ({st.brands.find((b) => b.id === selfSeller.brandId)?.name}). Visitantes verão seu avatar
                  ao vivo e poderão solicitar uma conversa por voz. O microfone só é ativado quando você aceitar uma chamada.
                </p>
              </>
            ) : (
              <>
                <h1 className="mt-4 font-display text-4xl font-bold uppercase leading-none">Bem-vindo ao pavilhão</h1>
                {sstatus.phase !== 'aberta' && (
                  <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-100">
                    A feira está {phaseLabel[sstatus.phase].toLowerCase()}{sstatus.nextOpen ? ` — abre em ${fmtDateTime(sstatus.nextOpen)}` : ''}. Você pode fazer uma visita prévia; vendedores podem estar offline.
                  </p>
                )}
                <label className="mt-5 block">
                  <span className="label">Como você quer ser identificado</span>
                  <input className="input" value={visitorName} maxLength={32} onChange={(e) => setVName(e.target.value)} />
                </label>
              </>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-zinc-400">
              {isTouch ? (
                <>
                  <p className="rounded-xl bg-white/[0.04] p-3"><b className="text-white">Joystick</b><br />Arraste no lado esquerdo para andar</p>
                  <p className="rounded-xl bg-white/[0.04] p-3"><b className="text-white">Olhar</b><br />Arraste no lado direito · toque para interagir</p>
                </>
              ) : (
                <>
                  <p className="rounded-xl bg-white/[0.04] p-3"><b className="text-white">W A S D</b> / setas para andar<br /><b className="text-white">Shift</b> para acelerar</p>
                  <p className="rounded-xl bg-white/[0.04] p-3"><b className="text-white">Mouse</b> para olhar · <b className="text-white">E</b> ou clique para interagir · <b className="text-white">Esc</b> libera o cursor</p>
                </>
              )}
            </div>
            <button className="btn-gold mt-6 w-full py-3.5 text-base" onClick={enter}>
              {role === 'seller' ? 'Iniciar plantão' : 'Entrar na feira'}
            </button>
            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
              <Link to="/" className="hover:text-white">← Voltar ao início</Link>
              <span>Qualidade gráfica: {quality}</span>
            </div>
          </div>
        </div>
      )}

      {/* HUD */}
      {ready && entered && (
        <>
          {/* topo */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3 sm:p-4">
            <div className="pointer-events-auto flex min-w-0 items-center gap-2">
              <button className="glass rounded-xl p-2.5 text-zinc-200" onClick={() => navigate('/')} aria-label="Sair da feira"><ArrowLeft size={18} /></button>
              <div className="glass hidden items-center gap-2 rounded-xl px-3 py-2 sm:flex">
                <span className={`h-2 w-2 rounded-full ${sstatus.phase === 'aberta' ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                <span className="text-xs font-semibold">{season.name.replace('FITNESS WORLD EXPO — ', '')}</span>
                <span className="text-xs text-zinc-500">{phaseLabel[sstatus.phase]}</span>
              </div>
              {role === 'seller' && <div className="glass rounded-xl border-emerald-400/30 px-3 py-2 text-xs font-semibold text-emerald-300">● MODO VENDEDOR · {selfSeller?.name}</div>}
              {zoneBrand && role === 'visitor' && (
                <button onClick={() => setBoothId(zoneBrand.id)} className="glass fade-up flex min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-left">
                  <span className="h-6 w-1.5 rounded" style={{ background: zoneBrand.booth.secondaryColor }} />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-white">{zoneBrand.name}</span>
                    <span className="block text-[10px] text-zinc-400">Estande {zoneBrand.slotId} · ver catálogo</span>
                  </span>
                </button>
              )}
            </div>
            <div className="pointer-events-auto flex shrink-0 items-center gap-1.5">
              <button className="glass flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm" onClick={() => setShowDir(true)}><MapIcon size={17} /><span className="hidden lg:inline">Diretório</span></button>
              <button className="glass flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm" onClick={() => setShowSchedule(true)}><CalendarDays size={17} /><span className="hidden lg:inline">Programação</span></button>
              {role === 'visitor' && (
                <button className="glass relative flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm" onClick={() => setShowCart(true)}>
                  <ShoppingBag size={17} /><span className="hidden lg:inline">Carrinho</span>
                  {cartCount > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold-400 px-1 text-[11px] font-bold text-ink-950">{cartCount}</span>}
                </button>
              )}
              <button className="glass rounded-xl p-2.5" onClick={() => setShowHelp(true)} aria-label="Ajuda e configurações"><HelpCircle size={17} /></button>
            </div>
          </div>

          {/* mira */}
          {locked && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
              <div className={`h-2 w-2 rounded-full border transition ${hover ? 'scale-150 border-gold-300 bg-gold-300/40' : 'border-white/70'}`} />
            </div>
          )}

          {/* dica de cursor livre */}
          {!locked && !isTouch && !anyModal && (
            <div className="pointer-events-none absolute left-1/2 top-20 z-10 -translate-x-1/2">
              <div className="glass flex items-center gap-2 rounded-full px-4 py-2 text-xs text-zinc-300"><MousePointer2 size={14} /> Clique na cena para olhar com o mouse · ou clique direto nos produtos e vendedores</div>
            </div>
          )}

          {/* prompt de interação / vendedor próximo */}
          <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex flex-col items-center gap-2 px-3 sm:bottom-6">
            {hoverLabel && (
              <div className="glass fade-up flex items-center gap-3 rounded-2xl px-4 py-2.5">
                {!isTouch && <kbd className="rounded-md border border-white/20 bg-white/10 px-2 py-0.5 text-xs font-bold">E</kbd>}
                <div>
                  <p className="text-sm font-semibold text-white">{hoverLabel.t}</p>
                  <div>{hoverLabel.s}</div>
                </div>
                <span className="text-xs font-semibold text-gold-300">{hoverLabel.a}</span>
              </div>
            )}
            {nearSellerObj && role === 'visitor' && !callActive && (
              <div className="glass pointer-events-auto fade-up flex items-center gap-3 rounded-2xl px-4 py-3">
                <span className={`h-3 w-3 rounded-full ${onlineIds.has(nearSellerObj.id) ? 'bg-emerald-400 pulse-ring' : 'bg-zinc-600'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{nearSellerObj.name}</p>
                  <p className="text-xs text-zinc-400">{onlineIds.has(nearSellerObj.id) ? 'Online · atendimento humano por voz' : `Offline · ${shiftLabelFor(nearSellerObj, sstatus.day)}`}</p>
                </div>
                {onlineIds.has(nearSellerObj.id) ? (
                  <button className="btn-gold px-3 py-2 text-xs" onClick={() => startCall(nearSellerObj)}><Mic size={14} /> Iniciar conversa</button>
                ) : (
                  <button className="btn-ghost px-3 py-2 text-xs" onClick={() => setShowHelp(true)}>Como testar</button>
                )}
              </div>
            )}
          </div>

          {/* minimapa */}
          {showMap && (
            <div className="pointer-events-auto absolute bottom-4 right-4 z-20 hidden w-56 sm:block">
              <div className="glass overflow-hidden rounded-2xl p-2">
                <div className="mb-1 flex items-center justify-between px-1">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Mapa</span>
                  <button onClick={() => setShowMap(false)} className="text-zinc-500 hover:text-white" aria-label="Ocultar mapa"><X size={13} /></button>
                </div>
                <button className="block w-full" onClick={() => setShowDir(true)}>
                  <HallMap brands={st.brands} player={pose} sellersOnline={onlineSellerDots} showLabels={false} highlightBrandId={zone} className="h-56 w-full" />
                </button>
                <p className="px-1 pt-1 text-[10px] text-zinc-500">{peers.length} pessoa(s) conectada(s) · {onlineIds.size} vendedor(es) online</p>
              </div>
            </div>
          )}
          {!showMap && (
            <button className="glass absolute bottom-4 right-4 z-20 hidden rounded-xl p-2.5 sm:block" onClick={() => setShowMap(true)} aria-label="Mostrar mapa"><MapIcon size={17} /></button>
          )}

          {/* joystick (toque) */}
          {isTouch && <JoystickHint engine={engineRef} />}

          {/* chamada de voz */}
          {callPeer && callActive && callRef.current && (
            <div className="absolute right-3 top-16 z-30 sm:right-4">
              <VoicePanel
                call={callRef.current}
                state={callState}
                info={callInfo}
                peerName={callPeer.name}
                peerSub={callPeer.sub}
                role={role}
                chat={chat}
                transportLabel={transportRef.current?.scopeLabel ?? ''}
                onClose={() => { setCallState('idle'); setCallPeer(null); }}
              />
            </div>
          )}

          {/* chamada recebida (vendedor) */}
          {callState === 'incoming' && callRef.current && (
            <div className="absolute inset-0 z-40 grid place-items-center bg-black/50 p-4 backdrop-blur-sm">
              <div className="glass fade-up w-full max-w-sm rounded-3xl p-6 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-400/15 text-emerald-300 pulse-ring"><PhoneIncoming size={26} /></div>
                <p className="mt-4 text-lg font-semibold">{callPeer?.name ?? 'Visitante'}</p>
                <p className="text-sm text-zinc-400">quer conversar por voz no seu estande</p>
                <div className="mt-6 flex gap-2">
                  <button className="btn-danger flex-1" onClick={() => callRef.current?.decline()}>Recusar</button>
                  <button className="btn-gold flex-1" onClick={() => callRef.current?.accept()}><Mic size={16} /> Atender</button>
                </div>
              </div>
            </div>
          )}

          {/* lista de visitantes (vendedor) */}
          {role === 'seller' && (
            <div className="glass absolute bottom-4 left-4 z-20 hidden w-64 rounded-2xl p-3 sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Visitantes conectados</p>
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {peers.filter((p) => p.role === 'visitor').length === 0 && <p className="text-xs text-zinc-500">Nenhum visitante conectado. Abra a feira em outra aba como visitante para testar.</p>}
                {peers.filter((p) => p.role === 'visitor').map((p) => (
                  <p key={p.peerId} className="flex items-center gap-2 text-xs text-zinc-300"><span className="h-1.5 w-1.5 rounded-full bg-sky-400" /> {p.name}{p.inCallWith ? ' · em chamada' : ''}</p>
                ))}
              </div>
            </div>
          )}

          {/* toasts */}
          <div className="pointer-events-none absolute left-1/2 top-16 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
            {toasts.map((t) => (
              <div key={t.id} className="glass fade-up rounded-xl px-4 py-2 text-sm text-white">{t.text}</div>
            ))}
          </div>
        </>
      )}

      {/* Janelas */}
      <ProductModal
        key={productId ?? 'none'}
        product={product}
        brand={productBrand}
        sellers={product ? st.sellers.filter((s) => s.brandId === product.brandId && s.active) : []}
        onlineIds={onlineIds}
        onClose={() => setProductId(null)}
        onAdded={(p: Product, qty: number) => {
          cartActions.add(p.id, visitor.id, qty);
          setProductId(null);
          toast(`${qty}× ${p.name} adicionado ao carrinho`);
        }}
        onGoBooth={() => {
          if (product) engineRef.current?.goToBooth(product.brandId, getState());
          setProductId(null);
        }}
        onTalk={startCall}
      />
      <BoothPanel
        brand={boothId ? st.brands.find((b) => b.id === boothId) ?? null : null}
        st={st}
        onlineIds={onlineIds}
        shiftLabel={(s) => shiftLabelFor(s, sstatus.day)}
        onClose={() => setBoothId(null)}
        onProduct={(p) => {
          setBoothId(null);
          setProductId(p.id);
          track('produto_visto', visitor.id, { brandId: p.brandId, productId: p.id });
        }}
        onTalk={startCall}
        onGo={() => {
          if (boothId) engineRef.current?.goToBooth(boothId, getState());
          setBoothId(null);
        }}
      />
      <DirectoryModal
        open={showDir}
        st={st}
        pose={pose}
        onlineSellers={onlineSellerDots}
        onClose={() => setShowDir(false)}
        onGoBrand={(id) => { engineRef.current?.goToBooth(id, getState()); setShowDir(false); }}
        onGoStage={() => { engineRef.current?.goToStage(); setShowDir(false); }}
        onGoLobby={() => { engineRef.current?.goToLobby(); setShowDir(false); }}
        onOpenBrand={(id) => { setShowDir(false); setBoothId(id); }}
      />
      <ScheduleModal open={showSchedule} st={st} onClose={() => setShowSchedule(false)} />
      <CartDrawer open={showCart} st={st} onClose={() => setShowCart(false)} />
      {showHelp && (
        <HelpModal
          quality={quality}
          fps={fps}
          role={role}
          onQuality={(q) => {
            try { localStorage.setItem('fwe:quality', q); } catch { /* ignora */ }
            setShowHelp(false);
            setEntered(false);
            setQuality(q);
          }}
          onClose={() => setShowHelp(false)}
        />
      )}
    </div>
  );
}

function JoystickHint({ engine }: { engine: React.MutableRefObject<ExpoEngine | null> }) {
  const [j, setJ] = useState({ active: false, ox: 0, oy: 0, x: 0, y: 0 });
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const s = engine.current?.input.joy;
      if (s) setJ((prev) => (prev.active === s.active && prev.x === s.x && prev.y === s.y ? prev : { ...s }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine]);
  if (!j.active) {
    return (
      <div className="pointer-events-none absolute bottom-8 left-8 z-10 grid h-28 w-28 place-items-center rounded-full border border-white/15 bg-white/[0.03]">
        <div className="h-11 w-11 rounded-full border border-white/25 bg-white/10" />
        <span className="absolute -bottom-5 text-[10px] text-zinc-400">arraste para andar</span>
      </div>
    );
  }
  return (
    <div className="pointer-events-none fixed z-10" style={{ left: j.ox - 56, top: j.oy - 56 }}>
      <div className="relative h-28 w-28 rounded-full border border-white/20 bg-white/[0.05]">
        <div className="absolute h-11 w-11 rounded-full bg-gold-400/70" style={{ left: 56 - 22 + j.x * 50, top: 56 - 22 + j.y * 50 }} />
      </div>
    </div>
  );
}

function HelpModal({ quality, fps, role, onQuality, onClose }: { quality: Quality; fps: number; role: 'visitor' | 'seller'; onQuality: (q: Quality) => void; onClose: () => void }) {
  const session = getSession();
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="glass fade-up max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl p-6" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="font-semibold">Ajuda e configurações</p>
          <button onClick={onClose} className="text-zinc-400 hover:text-white" aria-label="Fechar"><X size={18} /></button>
        </div>
        <div className="mt-5 space-y-5 text-sm">
          <div>
            <p className="eyebrow mb-2 flex items-center gap-2"><Gauge size={13} /> Qualidade gráfica</p>
            <div className="flex gap-2">
              {(['alta', 'media', 'baixa'] as Quality[]).map((q) => (
                <button key={q} className={q === quality ? 'btn-gold flex-1' : 'btn-ghost flex-1'} onClick={() => onQuality(q)}>{q === 'media' ? 'média' : q}</button>
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-500">Alta: bloom e iluminação por estande. Baixa: indicada para celulares. Desempenho atual: {fps} fps.</p>
          </div>
          <div>
            <p className="eyebrow mb-2 flex items-center gap-2"><Mic size={13} /> Como testar o atendimento por voz</p>
            <ol className="list-decimal space-y-1 pl-5 text-zinc-300">
              <li>Abra o <b>Painel da Empresa</b> em outra aba (ex.: conta IRONCORE).</li>
              <li>Em <b>Vendedores</b>, clique em <b>Entrar na feira como vendedor</b>.</li>
              <li>Nesta aba (visitante), aproxime-se do avatar do vendedor — ele aparecerá <b className="text-emerald-300">online</b>.</li>
              <li>Clique em <b>Iniciar conversa</b>, permita o microfone e atenda na aba do vendedor.</li>
            </ol>
            <p className="mt-2 text-xs text-zinc-500">
              O áudio é real (WebRTC). Neste protótipo a sinalização funciona entre abas do mesmo navegador. Para conectar pessoas em
              computadores diferentes é necessário o servidor de tempo real — <span className="text-amber-300">integração pendente</span>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <IntegrationTag kind="local" />
            <IntegrationTag kind="simulado" />
            <Link to="/status" className="text-xs text-gold-300 underline">Ver status de todas as integrações</Link>
          </div>
          {role === 'visitor' && !session && (
            <Link to="/empresa" className="btn-ghost w-full"><Store size={15} /> Abrir Painel da Empresa</Link>
          )}
        </div>
      </div>
    </div>
  );
}
