// Modelo de domínio da FITNESS WORLD EXPO.
// Estes tipos são a "fonte da verdade" compartilhada entre o ambiente 3D,
// os painéis e a camada de dados. Em produção, refletem as tabelas do backend
// (ver docs/schema.sql).

export type ID = string;

// ---------- Marcas e estandes ----------

export type BrandStatus = 'pendente' | 'aprovada' | 'suspensa';
export type BoothTier = 'standard' | 'premium' | 'master';
export type BoothArchitecture = 'ilha' | 'peninsula' | 'mezanino' | 'portal';
export type BoothDecoration = 'minimalista' | 'industrial' | 'natural' | 'neon';
export type BoothFloor = 'carpete' | 'madeira' | 'resina';
export type LogoMode = 'texto' | 'imagem';

export interface BoothConfig {
  architecture: BoothArchitecture;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  lightingColor: string;
  lightingIntensity: number; // 0..1.5
  floor: BoothFloor;
  decoration: BoothDecoration;
  logoMode: LogoMode;
  logoText: string;
  logoImage?: string; // dataURL (até ~300KB) — em produção: URL de storage
  tagline: string;
  screenHeadline: string;
  screenSubline: string;
  screenImage?: string; // dataURL opcional para o telão
  vitrineCount: number; // 1..4
  counters: number; // balcões de atendimento 1..2
}

export interface Brand {
  id: ID;
  name: string;
  segment: string;
  description: string;
  contactEmail: string;
  website?: string;
  status: BrandStatus;
  tier: BoothTier;
  slotId: string | null; // posição no pavilhão
  seasonIds: ID[];
  booth: BoothConfig;
  createdAt: string;
  isDemo: boolean; // marca fictícia de demonstração
}

export type ProductShape = 'pote' | 'garrafa' | 'caixa' | 'refil' | 'shaker';

export interface Product {
  id: ID;
  brandId: ID;
  name: string;
  category: string;
  shape: ProductShape;
  color: string;
  price: number;
  promoPrice?: number | null;
  size: string; // "900 g", "60 caps"...
  description: string;
  features: string[];
  inStock: boolean;
  isLaunch: boolean;
  featured: boolean; // exposto nas vitrines 3D
}

// ---------- Vendedores ----------

export interface AvatarConfig {
  body: 'masculino' | 'feminino';
  skin: string;
  hair: 'curto' | 'raspado' | 'coque' | 'longo' | 'cacheado';
  hairColor: string;
  outfit: 'polo' | 'jaqueta' | 'regata';
  outfitColor: string;
  pantsColor: string;
  height: number; // metros
  build: 'atletico' | 'medio' | 'forte';
  accessory: 'nenhum' | 'oculos' | 'headset';
}

export interface Shift {
  day: number; // dia da temporada (1..N)
  start: string; // "10:00"
  end: string; // "14:00"
}

export interface Seller {
  id: ID;
  brandId: ID;
  name: string;
  title: string;
  languages: string[];
  bio: string;
  avatar: AvatarConfig;
  shifts: Shift[];
  active: boolean;
}

// ---------- Temporadas e programação ----------

export type EventType = 'lancamento' | 'palestra' | 'promocao' | 'especial' | 'competicao';

export interface ScheduleEvent {
  id: ID;
  seasonId: ID;
  title: string;
  type: EventType;
  brandId?: ID | null;
  location: string;
  start: string; // ISO
  end: string; // ISO
  description: string;
}

export type SeasonStatus = 'rascunho' | 'publicada';

export interface Season {
  id: ID;
  number: number;
  name: string;
  theme: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (inclusive)
  dailyOpen: string; // "10:00"
  dailyClose: string; // "22:00"
  status: SeasonStatus;
  description: string;
}

export type SponsorTier = 'diamante' | 'ouro' | 'prata';

export interface Sponsor {
  id: ID;
  seasonId: ID;
  name: string;
  tier: SponsorTier;
  value: number;
  placements: string[];
  contractStatus: 'proposta' | 'assinado' | 'cancelado';
}

// ---------- Comércio ----------

export interface CartItem {
  productId: ID;
  brandId: ID;
  qty: number;
}

export type OrderStatus =
  | 'aguardando_marca' // pedido registrado, a marca ainda não confirmou
  | 'confirmado'
  | 'enviado'
  | 'entregue'
  | 'cancelado';

export interface OrderLine {
  productId: ID;
  name: string;
  unitPrice: number;
  qty: number;
}

export interface Order {
  id: ID;
  code: string;
  brandId: ID;
  seasonId: ID | null;
  visitorId: string;
  customer: { name: string; email: string; phone: string; document: string; cep: string; address: string; city: string };
  lines: OrderLine[];
  subtotal: number;
  shipping: number;
  total: number;
  commissionRate: number; // % congelado no momento da compra
  commissionValue: number;
  paymentMethod: 'pix' | 'cartao' | 'boleto';
  paymentStatus: 'simulado';
  status: OrderStatus;
  createdAt: string;
  isDemo: boolean;
}

// ---------- Monetização ----------

export interface AdSlot {
  id: ID;
  name: string;
  location: string;
  pricePerDay: number;
  advertiser: string | null;
  message: string;
  active: boolean;
}

export interface MonetizationConfig {
  currency: 'BRL';
  participationFee: Record<BoothTier, number>;
  sponsorshipPrice: Record<SponsorTier, number>;
  commissionRate: number; // % global
  brandCommissionOverrides: Record<ID, number>;
  adSlots: AdSlot[];
}

// ---------- Métricas ----------

export type AnalyticsType =
  | 'sessao'
  | 'visita_estande'
  | 'produto_visto'
  | 'chamada_solicitada'
  | 'chamada_conectada'
  | 'carrinho_adicionado'
  | 'pedido';

export interface AnalyticsEvent {
  id: ID;
  type: AnalyticsType;
  visitorId: string;
  brandId?: ID;
  productId?: ID;
  sellerId?: ID;
  seasonId?: ID | null;
  ts: string;
  isDemo: boolean;
}

// ---------- Estado global ----------

export interface ExpoState {
  version: number;
  brands: Brand[];
  products: Product[];
  sellers: Seller[];
  seasons: Season[];
  events: ScheduleEvent[];
  sponsors: Sponsor[];
  orders: Order[];
  analytics: AnalyticsEvent[];
  monetization: MonetizationConfig;
  activeSeasonId: ID;
}
