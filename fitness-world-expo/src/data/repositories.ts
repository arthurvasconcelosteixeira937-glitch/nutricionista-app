import type {
  AnalyticsEvent, AnalyticsType, BoothConfig, Brand, ExpoState, MonetizationConfig, Order, OrderStatus, Product,
  ScheduleEvent, Season, Seller, Sponsor,
} from '@/domain/types';
import type { Session } from '@/services/auth';
import { getState, setState } from './store';
import { uid } from '@/lib/util';

// Camada de acesso a dados com ESCOPO POR PERFIL.
// Toda operação de empresa exige uma sessão `brand` e só toca dados daquele
// brandId. Toda operação de plataforma exige sessão `admin`.
// Em produção, as mesmas regras são reforçadas no servidor (RLS).

export class AccessDenied extends Error {}

function assertBrand(session: Session, brandId: string) {
  if (!session || session.role !== 'brand' || session.brandId !== brandId) {
    throw new AccessDenied('Acesso negado: esta conta não pertence a esta empresa.');
  }
}
function assertAdmin(session: Session) {
  if (!session || session.role !== 'admin') throw new AccessDenied('Acesso restrito ao administrador da plataforma.');
}

// ---------- Leitura escopada da empresa ----------

export function brandView(st: ExpoState, session: Session, brandId: string) {
  assertBrand(session, brandId);
  const brand = st.brands.find((b) => b.id === brandId)!;
  return {
    brand,
    products: st.products.filter((p) => p.brandId === brandId),
    sellers: st.sellers.filter((s) => s.brandId === brandId),
    orders: st.orders.filter((o) => o.brandId === brandId),
    analytics: st.analytics.filter((a) => a.brandId === brandId),
    events: st.events.filter((e) => e.brandId === brandId),
  };
}

// ---------- Escrita: empresa ----------

export const brandRepo = {
  updateBooth(session: Session, brandId: string, patch: Partial<BoothConfig>) {
    assertBrand(session, brandId);
    setState((s) => ({ ...s, brands: s.brands.map((b) => (b.id === brandId ? { ...b, booth: { ...b.booth, ...patch } } : b)) }));
  },
  updateProfile(session: Session, brandId: string, patch: Partial<Pick<Brand, 'name' | 'description' | 'segment' | 'website' | 'contactEmail'>>) {
    assertBrand(session, brandId);
    setState((s) => ({ ...s, brands: s.brands.map((b) => (b.id === brandId ? { ...b, ...patch } : b)) }));
  },
  upsertProduct(session: Session, brandId: string, product: Product) {
    assertBrand(session, brandId);
    const p = { ...product, brandId };
    setState((s) => {
      const exists = s.products.some((x) => x.id === p.id);
      return { ...s, products: exists ? s.products.map((x) => (x.id === p.id && x.brandId === brandId ? p : x)) : [...s.products, p] };
    });
  },
  deleteProduct(session: Session, brandId: string, productId: string) {
    assertBrand(session, brandId);
    setState((s) => ({ ...s, products: s.products.filter((p) => !(p.id === productId && p.brandId === brandId)) }));
  },
  upsertSeller(session: Session, brandId: string, seller: Seller) {
    assertBrand(session, brandId);
    const v = { ...seller, brandId };
    setState((s) => {
      const exists = s.sellers.some((x) => x.id === v.id);
      return { ...s, sellers: exists ? s.sellers.map((x) => (x.id === v.id && x.brandId === brandId ? v : x)) : [...s.sellers, v] };
    });
  },
  deleteSeller(session: Session, brandId: string, sellerId: string) {
    assertBrand(session, brandId);
    setState((s) => ({ ...s, sellers: s.sellers.filter((x) => !(x.id === sellerId && x.brandId === brandId)) }));
  },
  updateOrderStatus(session: Session, brandId: string, orderId: string, status: OrderStatus) {
    assertBrand(session, brandId);
    setState((s) => ({ ...s, orders: s.orders.map((o) => (o.id === orderId && o.brandId === brandId ? { ...o, status } : o)) }));
  },
};

// ---------- Escrita: administrador ----------

export const adminRepo = {
  upsertSeason(session: Session, season: Season) {
    assertAdmin(session);
    setState((s) => ({ ...s, seasons: s.seasons.some((x) => x.id === season.id) ? s.seasons.map((x) => (x.id === season.id ? season : x)) : [...s.seasons, season] }));
  },
  deleteSeason(session: Session, id: string) {
    assertAdmin(session);
    setState((s) => ({ ...s, seasons: s.seasons.filter((x) => x.id !== id), events: s.events.filter((e) => e.seasonId !== id) }));
  },
  setActiveSeason(session: Session, id: string) {
    assertAdmin(session);
    setState((s) => ({ ...s, activeSeasonId: id }));
  },
  updateBrand(session: Session, brandId: string, patch: Partial<Brand>) {
    assertAdmin(session);
    setState((s) => {
      // um slot só pode pertencer a uma marca
      let brands = s.brands;
      if (patch.slotId) brands = brands.map((b) => (b.id !== brandId && b.slotId === patch.slotId ? { ...b, slotId: null } : b));
      return { ...s, brands: brands.map((b) => (b.id === brandId ? { ...b, ...patch } : b)) };
    });
  },
  upsertEvent(session: Session, ev: ScheduleEvent) {
    assertAdmin(session);
    setState((s) => ({ ...s, events: s.events.some((x) => x.id === ev.id) ? s.events.map((x) => (x.id === ev.id ? ev : x)) : [...s.events, ev] }));
  },
  deleteEvent(session: Session, id: string) {
    assertAdmin(session);
    setState((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }));
  },
  upsertSponsor(session: Session, sp: Sponsor) {
    assertAdmin(session);
    setState((s) => ({ ...s, sponsors: s.sponsors.some((x) => x.id === sp.id) ? s.sponsors.map((x) => (x.id === sp.id ? sp : x)) : [...s.sponsors, sp] }));
  },
  deleteSponsor(session: Session, id: string) {
    assertAdmin(session);
    setState((s) => ({ ...s, sponsors: s.sponsors.filter((x) => x.id !== id) }));
  },
  updateMonetization(session: Session, patch: Partial<MonetizationConfig>) {
    assertAdmin(session);
    setState((s) => ({ ...s, monetization: { ...s.monetization, ...patch } }));
  },
  updateSellerShifts(session: Session, sellerId: string, shifts: Seller['shifts']) {
    assertAdmin(session);
    setState((s) => ({ ...s, sellers: s.sellers.map((x) => (x.id === sellerId ? { ...x, shifts } : x)) }));
  },
  /** Insere pedidos e métricas MARCADOS COMO DEMONSTRAÇÃO (isDemo = true). */
  generateDemoData(session: Session) {
    assertAdmin(session);
    const st = getState();
    const brands = st.brands.filter((b) => b.status === 'aprovada');
    const orders: Order[] = [];
    const analytics: AnalyticsEvent[] = [];
    const now = Date.now();
    const rnd = (n: number) => Math.floor(Math.random() * n);
    for (let i = 0; i < 160; i++) {
      const b = brands[rnd(brands.length)];
      const vid = `demo-${rnd(60)}`;
      const ts = new Date(now - rnd(3 * 86400000)).toISOString();
      const types: AnalyticsType[] = ['visita_estande', 'visita_estande', 'produto_visto', 'produto_visto', 'chamada_solicitada', 'carrinho_adicionado'];
      analytics.push({ id: uid('a-'), type: types[rnd(types.length)], visitorId: vid, brandId: b.id, seasonId: st.activeSeasonId, ts, isDemo: true });
    }
    for (let i = 0; i < 60; i++) analytics.push({ id: uid('a-'), type: 'sessao', visitorId: `demo-${i}`, seasonId: st.activeSeasonId, ts: new Date(now - rnd(3 * 86400000)).toISOString(), isDemo: true });
    for (let i = 0; i < 28; i++) {
      const b = brands[rnd(brands.length)];
      const prods = st.products.filter((p) => p.brandId === b.id);
      if (!prods.length) continue;
      const pr = prods[rnd(prods.length)];
      const qty = 1 + rnd(3);
      const unit = pr.promoPrice ?? pr.price;
      const subtotal = unit * qty;
      const rate = st.monetization.brandCommissionOverrides[b.id] ?? st.monetization.commissionRate;
      orders.push({
        id: uid('o-'), code: `DEMO-${1000 + i}`, brandId: b.id, seasonId: st.activeSeasonId, visitorId: `demo-${rnd(60)}`,
        customer: { name: `Cliente demonstração ${i + 1}`, email: 'demo@exemplo.com', phone: '', document: '', cep: '', address: '', city: 'São Paulo/SP' },
        lines: [{ productId: pr.id, name: pr.name, unitPrice: unit, qty }], subtotal, shipping: 0, total: subtotal,
        commissionRate: rate, commissionValue: +(subtotal * rate / 100).toFixed(2), paymentMethod: 'pix', paymentStatus: 'simulado',
        status: (['aguardando_marca', 'confirmado', 'enviado'] as OrderStatus[])[rnd(3)], createdAt: new Date(now - rnd(3 * 86400000)).toISOString(), isDemo: true,
      });
    }
    setState((s) => ({ ...s, orders: [...s.orders, ...orders], analytics: [...s.analytics, ...analytics] }));
  },
  clearDemoData(session: Session) {
    assertAdmin(session);
    setState((s) => ({ ...s, orders: s.orders.filter((o) => !o.isDemo), analytics: s.analytics.filter((a) => !a.isDemo) }));
  },
};

// ---------- Inscrição pública de marcas ----------

export function submitBrandApplication(data: { name: string; segment: string; description: string; contactEmail: string; website?: string; tier: Brand['tier'] }) {
  const st = getState();
  const id = uid('b-');
  const brand: Brand = {
    id, ...data, status: 'pendente', slotId: null, seasonIds: [], createdAt: new Date().toISOString(), isDemo: false,
    booth: {
      ...st.brands[0].booth, architecture: 'peninsula', primaryColor: '#1d2230', secondaryColor: '#e9c46a', accentColor: '#ffffff',
      lightingColor: '#ffffff', logoMode: 'texto', logoText: data.name.toUpperCase().slice(0, 14), logoImage: undefined, screenImage: undefined,
      tagline: data.segment.toUpperCase(), screenHeadline: data.name.toUpperCase(), screenSubline: 'Novo expositor', vitrineCount: 2, counters: 1,
    },
  };
  setState((s) => ({ ...s, brands: [...s.brands, brand] }));
  return brand;
}

// ---------- Métricas ----------

export function track(type: AnalyticsType, visitorId: string, data: Partial<AnalyticsEvent> = {}) {
  const ev: AnalyticsEvent = { id: uid('a-'), type, visitorId, ts: new Date().toISOString(), seasonId: getState().activeSeasonId, isDemo: false, ...data };
  setState((s) => ({ ...s, analytics: [...s.analytics.slice(-4000), ev] }));
}
