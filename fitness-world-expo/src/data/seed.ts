import type {
  AvatarConfig, Brand, BoothConfig, ExpoState, MonetizationConfig, Product, ScheduleEvent, Season, Seller, Sponsor,
} from '@/domain/types';
import { addDays, atTime, ymd } from '@/lib/util';

// IMPORTANTE: todas as marcas abaixo são FICTÍCIAS, criadas para demonstração.
// Marcas reais (ex.: Growth, Integralmedica, Max Titanium, Dux) só devem entrar
// na plataforma com autorização formal e com os próprios ativos de identidade.

export const STATE_VERSION = 3;

function booth(p: Partial<BoothConfig> & Pick<BoothConfig, 'primaryColor' | 'secondaryColor' | 'logoText'>): BoothConfig {
  return {
    architecture: 'ilha',
    accentColor: '#ffffff',
    lightingColor: '#ffffff',
    lightingIntensity: 1,
    floor: 'resina',
    decoration: 'minimalista',
    logoMode: 'texto',
    tagline: '',
    screenHeadline: 'LANÇAMENTOS DA TEMPORADA',
    screenSubline: 'Condições exclusivas durante a feira',
    vitrineCount: 3,
    counters: 1,
    ...p,
  };
}

const now = () => new Date().toISOString();

const BRANDS: Omit<Brand, 'seasonIds' | 'createdAt'>[] = [
  {
    id: 'b-ironcore', name: 'IRONCORE Nutrition', segment: 'Proteínas e whey',
    description: 'Linha completa de proteínas isoladas e concentradas para hipertrofia e recuperação.',
    contactEmail: 'expo@ironcore.demo', status: 'aprovada', tier: 'master', slotId: 'A1', isDemo: true,
    booth: booth({
      architecture: 'ilha', primaryColor: '#15161a', secondaryColor: '#d7263d', accentColor: '#ffffff', lightingColor: '#ff3a4f',
      lightingIntensity: 1.1, floor: 'resina', decoration: 'industrial', logoText: 'IRONCORE', tagline: 'FORGED FOR STRENGTH',
      screenHeadline: 'ISO WHEY BLACK — LANÇAMENTO', screenSubline: '20% OFF em toda a linha durante a Temporada 01', vitrineCount: 4, counters: 2,
    }),
  },
  {
    id: 'b-volta', name: 'VOLTA Supplements', segment: 'Pré-treinos e energia',
    description: 'Pré-treinos, cafeína e performance para treinos de alta intensidade.',
    contactEmail: 'expo@volta.demo', status: 'aprovada', tier: 'premium', slotId: 'A2', isDemo: true,
    booth: booth({
      architecture: 'peninsula', primaryColor: '#111111', secondaryColor: '#f5d000', accentColor: '#ffffff', lightingColor: '#ffe14d',
      lightingIntensity: 1.2, floor: 'resina', decoration: 'neon', logoText: 'VOLTA', tagline: 'CHARGE YOUR WORKOUT',
      screenHeadline: 'VOLTA SURGE 2.0', screenSubline: 'Novo pré-treino — experimente no estande', vitrineCount: 3,
    }),
  },
  {
    id: 'b-northpeak', name: 'NORTHPEAK Labs', segment: 'Vitaminas e saúde',
    description: 'Multivitamínicos, ômega 3 e suplementação para longevidade com rastreabilidade de lote.',
    contactEmail: 'expo@northpeak.demo', status: 'aprovada', tier: 'standard', slotId: 'A3', isDemo: true,
    booth: booth({
      architecture: 'portal', primaryColor: '#f2f4f5', secondaryColor: '#0f9d8a', accentColor: '#0b2f3a', lightingColor: '#bff6ec',
      lightingIntensity: 0.9, floor: 'madeira', decoration: 'natural', logoText: 'NORTHPEAK', tagline: 'SCIENCE FOR LONGEVITY',
      screenHeadline: 'LABORATÓRIO ABERTO', screenSubline: 'Laudos de pureza disponíveis por lote', vitrineCount: 3,
    }),
  },
  {
    id: 'b-primeforge', name: 'PRIME FORGE', segment: 'Creatina e força',
    description: 'Creatina monohidratada micronizada, beta-alanina e linha de força.',
    contactEmail: 'expo@primeforge.demo', status: 'aprovada', tier: 'master', slotId: 'A4', isDemo: true,
    booth: booth({
      architecture: 'mezanino', primaryColor: '#2b2f36', secondaryColor: '#ff6a13', accentColor: '#f4f4f4', lightingColor: '#ffb27a',
      lightingIntensity: 1, floor: 'carpete', decoration: 'industrial', logoText: 'PRIME FORGE', tagline: 'BUILT DIFFERENT',
      screenHeadline: 'CREATINA 100% PURA', screenSubline: 'Compre 2, leve 3 — somente na feira', vitrineCount: 4, counters: 2,
    }),
  },
  {
    id: 'b-aquafuel', name: 'AQUAFUEL', segment: 'Hidratação e endurance',
    description: 'Isotônicos, eletrólitos e géis de carboidrato para endurance.',
    contactEmail: 'expo@aquafuel.demo', status: 'aprovada', tier: 'standard', slotId: 'B1', isDemo: true,
    booth: booth({
      architecture: 'peninsula', primaryColor: '#0b3d91', secondaryColor: '#19c3ff', accentColor: '#ffffff', lightingColor: '#7fdcff',
      lightingIntensity: 1, floor: 'resina', decoration: 'minimalista', logoText: 'AQUAFUEL', tagline: 'HYDRATE. PERFORM. REPEAT.',
      screenHeadline: 'HIDRATAÇÃO INTELIGENTE', screenSubline: 'Kits para maratona com frete reduzido', vitrineCount: 2,
    }),
  },
  {
    id: 'b-pureroots', name: 'PURE ROOTS', segment: 'Proteína vegetal',
    description: 'Proteínas vegetais, superalimentos e linha clean label.',
    contactEmail: 'expo@pureroots.demo', status: 'aprovada', tier: 'premium', slotId: 'B2', isDemo: true,
    booth: booth({
      architecture: 'portal', primaryColor: '#efe8d8', secondaryColor: '#2f7d32', accentColor: '#1d3b1f', lightingColor: '#fff1cc',
      lightingIntensity: 0.9, floor: 'madeira', decoration: 'natural', logoText: 'PURE ROOTS', tagline: 'PLANT POWERED',
      screenHeadline: 'PROTEÍNA DE ERVILHA + ARROZ', screenSubline: 'Degustação guiada no estande', vitrineCount: 3,
    }),
  },
  {
    id: 'b-titanfit', name: 'TITANFIT Wear', segment: 'Vestuário e acessórios',
    description: 'Roupas de treino, coqueteleiras e acessórios premium.',
    contactEmail: 'expo@titanfit.demo', status: 'aprovada', tier: 'standard', slotId: 'B3', isDemo: true,
    booth: booth({
      architecture: 'ilha', primaryColor: '#1a1026', secondaryColor: '#b14cff', accentColor: '#ff4fd8', lightingColor: '#c77dff',
      lightingIntensity: 1.2, floor: 'resina', decoration: 'neon', logoText: 'TITANFIT', tagline: 'WEAR THE GRIND',
      screenHeadline: 'COLEÇÃO EXPO 01', screenSubline: 'Edição limitada com numeração', vitrineCount: 3,
    }),
  },
  {
    id: 'b-kaizen', name: 'KAIZEN Performance', segment: 'Termogênicos e definição',
    description: 'Termogênicos, L-carnitina e suporte para fases de definição.',
    contactEmail: 'expo@kaizen.demo', status: 'aprovada', tier: 'premium', slotId: 'B4', isDemo: true,
    booth: booth({
      architecture: 'mezanino', primaryColor: '#5c0a14', secondaryColor: '#d4a83f', accentColor: '#fff4dc', lightingColor: '#ffd38a',
      lightingIntensity: 1, floor: 'carpete', decoration: 'minimalista', logoText: 'KAIZEN', tagline: 'BETTER EVERY DAY',
      screenHeadline: 'PROTOCOLO CUTTING', screenSubline: 'Consultoria ao vivo com nossos especialistas', vitrineCount: 3,
    }),
  },
  {
    id: 'b-montanha', name: 'MONTANHA Nutri', segment: 'Pasta de amendoim e snacks',
    description: 'Pastas de oleaginosas, barras e snacks proteicos. (Inscrição aguardando aprovação.)',
    contactEmail: 'comercial@montanha.demo', status: 'pendente', tier: 'standard', slotId: null, isDemo: true,
    booth: booth({ primaryColor: '#3b2414', secondaryColor: '#e0a458', logoText: 'MONTANHA', tagline: 'ENERGIA DE VERDADE' }),
  },
];

let pc = 0;
function p(brandId: string, name: string, category: string, shape: Product['shape'], color: string, price: number, size: string,
  description: string, features: string[], extra: Partial<Product> = {}): Product {
  pc += 1;
  return {
    id: `p-${brandId.slice(2)}-${pc}`, brandId, name, category, shape, color, price, size, description, features,
    promoPrice: null, inStock: true, isLaunch: false, featured: true, ...extra,
  };
}

const PRODUCTS: Product[] = [
  p('b-ironcore', 'Iso Whey Black', 'Proteína', 'pote', '#111111', 249.9, '900 g', 'Whey protein isolado com 27 g de proteína por dose e baixo teor de lactose.', ['27 g de proteína por dose', 'Filtração por microfiltração', 'Sabores: chocolate, baunilha, cookies'], { isLaunch: true, promoPrice: 199.9 }),
  p('b-ironcore', 'Whey Concentrado 3W', 'Proteína', 'pote', '#d7263d', 159.9, '900 g', 'Blend de whey concentrado, isolado e hidrolisado.', ['24 g de proteína', 'Rico em BCAA naturais'], { promoPrice: 129.9 }),
  p('b-ironcore', 'Whey Refil 1,8 kg', 'Proteína', 'refil', '#2a2b30', 289.9, '1,8 kg', 'Refil econômico do whey concentrado 3W.', ['Embalagem sustentável', 'Rende 60 doses']),
  p('b-ironcore', 'Caseína Night', 'Proteína', 'pote', '#3a3d46', 179.9, '800 g', 'Caseína micelar de liberação lenta.', ['Ideal antes de dormir', '24 g de proteína']),
  p('b-ironcore', 'Shaker Iron 700 ml', 'Acessório', 'shaker', '#d7263d', 49.9, '700 ml', 'Coqueteleira com mola misturadora.', ['Livre de BPA', 'Tampa antivazamento']),
  p('b-ironcore', 'Protein Bar Box', 'Snack', 'caixa', '#d7263d', 89.9, '12 un', 'Barras com 20 g de proteína.', ['Sem adição de açúcar', '12 unidades']),

  p('b-volta', 'VOLTA Surge 2.0', 'Pré-treino', 'pote', '#f5d000', 189.9, '300 g', 'Pré-treino com cafeína, citrulina e beta-alanina.', ['200 mg de cafeína', '6 g de citrulina', '30 doses'], { isLaunch: true }),
  p('b-volta', 'VOLTA Stim-Free', 'Pré-treino', 'pote', '#ffffff', 169.9, '300 g', 'Pré-treino sem estimulantes para treinos noturnos.', ['Zero cafeína', 'Foco em pump']),
  p('b-volta', 'Energy Shot', 'Energia', 'garrafa', '#f5d000', 14.9, '60 ml', 'Shot energético pronto para beber.', ['150 mg de cafeína', 'Zero açúcar'], { promoPrice: 11.9 }),
  p('b-volta', 'Cafeína 420', 'Energia', 'garrafa', '#202020', 59.9, '90 caps', 'Cafeína anidra em cápsulas.', ['420 mg por dose']),
  p('b-volta', 'Kit Volta Box', 'Kit', 'caixa', '#f5d000', 299.9, 'Kit', 'Surge 2.0 + Shaker + 6 Energy Shots.', ['Economia de 25%'], { promoPrice: 249.9 }),

  p('b-northpeak', 'Multi Daily', 'Vitaminas', 'garrafa', '#0f9d8a', 89.9, '60 caps', 'Multivitamínico completo de alta biodisponibilidade.', ['23 vitaminas e minerais', 'Laudo por lote']),
  p('b-northpeak', 'Ômega 3 Ultra', 'Saúde', 'garrafa', '#f2c14e', 119.9, '120 caps', 'Ômega 3 concentrado na forma de triglicerídeos.', ['EPA 540 mg / DHA 360 mg'], { promoPrice: 99.9 }),
  p('b-northpeak', 'Vitamina D3 + K2', 'Vitaminas', 'garrafa', '#ffffff', 59.9, '30 ml', 'Gotas de D3 2000 UI com K2 MK-7.', ['Fórmula em gotas']),
  p('b-northpeak', 'Magnésio Quelato', 'Minerais', 'pote', '#0b2f3a', 79.9, '120 caps', 'Magnésio bisglicinato.', ['Alta absorção']),
  p('b-northpeak', 'Colágeno Peptídeos', 'Saúde', 'pote', '#e9d5c0', 139.9, '300 g', 'Peptídeos de colágeno hidrolisado.', ['10 g por dose'], { isLaunch: true }),

  p('b-primeforge', 'Creatina Forge 100%', 'Creatina', 'pote', '#ff6a13', 129.9, '300 g', 'Creatina monohidratada micronizada.', ['3 g por dose', '100 doses', 'Pureza demonstrativa 99,9%'], { promoPrice: 99.9 }),
  p('b-primeforge', 'Creatina Refil 1 kg', 'Creatina', 'refil', '#ff6a13', 289.9, '1 kg', 'Refil de creatina micronizada.', ['333 doses']),
  p('b-primeforge', 'Beta-Alanina', 'Performance', 'pote', '#2b2f36', 99.9, '200 g', 'Beta-alanina pura.', ['Retarda a fadiga muscular']),
  p('b-primeforge', 'Forge Hardcore', 'Pré-treino', 'pote', '#111111', 179.9, '300 g', 'Pré-treino de alta intensidade.', ['Para atletas avançados'], { isLaunch: true }),
  p('b-primeforge', 'Glutamina', 'Recuperação', 'pote', '#f4f4f4', 89.9, '300 g', 'L-glutamina pura.', ['5 g por dose']),
  p('b-primeforge', 'Shaker Forge Steel', 'Acessório', 'shaker', '#888b92', 89.9, '750 ml', 'Coqueteleira em aço inox.', ['Parede dupla']),

  p('b-aquafuel', 'Isotônico em Pó', 'Hidratação', 'pote', '#19c3ff', 69.9, '900 g', 'Repositor hidroeletrolítico.', ['Sódio, potássio e magnésio']),
  p('b-aquafuel', 'Gel Carbo Fuel (10 un)', 'Endurance', 'caixa', '#0b3d91', 79.9, '10 un', 'Gel de carboidrato com cafeína.', ['25 g de carbo por sachê'], { promoPrice: 64.9 }),
  p('b-aquafuel', 'Eletrólitos Tabs', 'Hidratação', 'garrafa', '#ffffff', 49.9, '20 tabs', 'Pastilhas efervescentes.', ['Zero açúcar'], { isLaunch: true }),
  p('b-aquafuel', 'Squeeze Térmica', 'Acessório', 'shaker', '#19c3ff', 59.9, '1 L', 'Garrafa térmica esportiva.', ['Mantém gelado por 12 h']),

  p('b-pureroots', 'Plant Protein Cacau', 'Proteína vegetal', 'pote', '#2f7d32', 169.9, '600 g', 'Proteína de ervilha e arroz.', ['21 g de proteína', 'Vegano'], { isLaunch: true }),
  p('b-pureroots', 'Plant Protein Baunilha', 'Proteína vegetal', 'pote', '#efe8d8', 169.9, '600 g', 'Proteína vegetal sabor baunilha.', ['Sem glúten']),
  p('b-pureroots', 'Superfood Greens', 'Superalimentos', 'refil', '#7cb342', 129.9, '300 g', 'Mix de vegetais verdes em pó.', ['Spirulina, chlorella e matcha'], { promoPrice: 109.9 }),
  p('b-pureroots', 'Pasta de Amendoim Clean', 'Snack', 'pote', '#a0522d', 39.9, '500 g', '100% amendoim.', ['Sem açúcar e sem sal']),

  p('b-titanfit', 'Camiseta Dry Titan', 'Vestuário', 'caixa', '#b14cff', 119.9, 'P–GG', 'Camiseta dry-fit edição Expo 01.', ['Tecido respirável', 'Edição numerada'], { isLaunch: true }),
  p('b-titanfit', 'Shaker Neon 600 ml', 'Acessório', 'shaker', '#ff4fd8', 39.9, '600 ml', 'Coqueteleira com compartimento.', ['Compartimento para cápsulas']),
  p('b-titanfit', 'Luva Pro Grip', 'Acessório', 'caixa', '#1a1026', 89.9, 'P–G', 'Luva de treino com munhequeira.', ['Couro sintético'], { promoPrice: 69.9 }),
  p('b-titanfit', 'Garrafa Titan 2 L', 'Acessório', 'garrafa', '#b14cff', 69.9, '2 L', 'Galão com marcação de horários.', ['Livre de BPA']),

  p('b-kaizen', 'Thermo Kaizen', 'Termogênico', 'garrafa', '#5c0a14', 129.9, '60 caps', 'Termogênico com cafeína e pimenta.', ['Fórmula demonstrativa'], { isLaunch: true }),
  p('b-kaizen', 'L-Carnitina 2000', 'Definição', 'garrafa', '#d4a83f', 89.9, '400 ml', 'L-carnitina líquida.', ['2 g por dose'], { promoPrice: 74.9 }),
  p('b-kaizen', 'CLA 1000', 'Definição', 'garrafa', '#fff4dc', 99.9, '120 caps', 'Ácido linoleico conjugado.', ['1 g por cápsula']),
  p('b-kaizen', 'Whey Zero Lactose', 'Proteína', 'pote', '#5c0a14', 219.9, '900 g', 'Whey isolado zero lactose.', ['26 g de proteína']),
  p('b-kaizen', 'Kit Cutting 30 dias', 'Kit', 'caixa', '#d4a83f', 349.9, 'Kit', 'Thermo + Carnitina + CLA.', ['Economia de 20%']),
];

const av = (a: Partial<AvatarConfig>): AvatarConfig => ({
  body: 'masculino', skin: '#c68e6a', hair: 'curto', hairColor: '#1e1712', outfit: 'polo', outfitColor: '#222222',
  pantsColor: '#1c1f26', height: 1.78, build: 'atletico', accessory: 'nenhum', ...a,
});

const SELLERS: Seller[] = [
  { id: 's-ic-1', brandId: 'b-ironcore', name: 'Rafael Moreira', title: 'Consultor de Performance', languages: ['Português', 'Inglês'], bio: 'Atleta de physique e consultor da linha de proteínas.', avatar: av({ outfitColor: '#d7263d', skin: '#b9825d', build: 'forte', height: 1.82 }), shifts: [{ day: 1, start: '10:00', end: '16:00' }, { day: 2, start: '14:00', end: '22:00' }], active: true },
  { id: 's-ic-2', brandId: 'b-ironcore', name: 'Camila Duarte', title: 'Nutricionista Esportiva', languages: ['Português', 'Espanhol'], bio: 'Nutricionista (dados demonstrativos).', avatar: av({ body: 'feminino', outfitColor: '#15161a', skin: '#e0b08f', hair: 'coque', hairColor: '#4a2c1a', height: 1.66, accessory: 'headset' }), shifts: [{ day: 1, start: '16:00', end: '22:00' }, { day: 3, start: '10:00', end: '18:00' }], active: true },
  { id: 's-vo-1', brandId: 'b-volta', name: 'Bruno Tavares', title: 'Especialista em Pré-treino', languages: ['Português'], bio: 'Treinador e embaixador da marca.', avatar: av({ outfitColor: '#f5d000', skin: '#8d5a3b', hair: 'raspado', outfit: 'regata', build: 'forte' }), shifts: [{ day: 1, start: '10:00', end: '22:00' }], active: true },
  { id: 's-np-1', brandId: 'b-northpeak', name: 'Helena Prado', title: 'Farmacêutica', languages: ['Português', 'Inglês'], bio: 'Responsável técnica (demonstrativo).', avatar: av({ body: 'feminino', outfitColor: '#0f9d8a', outfit: 'jaqueta', skin: '#f1c7a5', hair: 'longo', hairColor: '#7a5230', height: 1.68, accessory: 'oculos' }), shifts: [{ day: 1, start: '12:00', end: '20:00' }], active: true },
  { id: 's-pf-1', brandId: 'b-primeforge', name: 'Diego Albuquerque', title: 'Gerente Comercial', languages: ['Português', 'Inglês'], bio: 'Atendimento para atacado e varejo.', avatar: av({ outfitColor: '#ff6a13', skin: '#c68e6a', hair: 'cacheado', hairColor: '#120d0a', height: 1.8 }), shifts: [{ day: 1, start: '10:00', end: '18:00' }], active: true },
  { id: 's-aq-1', brandId: 'b-aquafuel', name: 'Marina Costa', title: 'Consultora de Endurance', languages: ['Português'], bio: 'Triatleta e consultora.', avatar: av({ body: 'feminino', outfitColor: '#19c3ff', skin: '#d39c7b', hair: 'coque', hairColor: '#2a1b10', height: 1.7, build: 'atletico' }), shifts: [{ day: 1, start: '10:00', end: '16:00' }], active: true },
  { id: 's-pr-1', brandId: 'b-pureroots', name: 'Thiago Lima', title: 'Nutrição Plant-Based', languages: ['Português'], bio: 'Especialista em proteínas vegetais.', avatar: av({ outfitColor: '#2f7d32', skin: '#a26b4a', hair: 'curto', hairColor: '#1b130d', outfit: 'jaqueta', build: 'medio' }), shifts: [{ day: 1, start: '14:00', end: '22:00' }], active: true },
  { id: 's-tf-1', brandId: 'b-titanfit', name: 'Juliana Reis', title: 'Visual Merchandiser', languages: ['Português', 'Inglês'], bio: 'Coleções e acessórios.', avatar: av({ body: 'feminino', outfitColor: '#b14cff', skin: '#7b4b32', hair: 'cacheado', hairColor: '#120d0a', height: 1.69 }), shifts: [{ day: 1, start: '10:00', end: '22:00' }], active: true },
  { id: 's-kz-1', brandId: 'b-kaizen', name: 'André Nakamura', title: 'Consultor de Definição', languages: ['Português', 'Japonês'], bio: 'Coach de fisiculturismo.', avatar: av({ outfitColor: '#5c0a14', skin: '#e8c19e', hair: 'curto', hairColor: '#0d0d0d', build: 'forte', height: 1.75, accessory: 'headset' }), shifts: [{ day: 1, start: '10:00', end: '18:00' }], active: true },
];

function seasons(): { seasons: Season[]; events: ScheduleEvent[]; sponsors: Sponsor[] } {
  const today = new Date();
  const s1Start = addDays(today, -1);
  const s1End = addDays(s1Start, 4);
  const s2Start = addDays(today, 120);
  const s2End = addDays(s2Start, 4);
  const S1: Season = {
    id: 'season-01', number: 1, name: 'FITNESS WORLD EXPO — TEMPORADA 01', theme: 'A força do mercado fitness em um só lugar',
    startDate: ymd(s1Start), endDate: ymd(s1End), dailyOpen: '10:00', dailyClose: '22:00', status: 'publicada',
    description: '5 dias de feira com lançamentos, atendimento ao vivo com especialistas das marcas e condições exclusivas.',
  };
  const S2: Season = {
    id: 'season-02', number: 2, name: 'FITNESS WORLD EXPO — TEMPORADA 02', theme: 'Performance e longevidade',
    startDate: ymd(s2Start), endDate: ymd(s2End), dailyOpen: '10:00', dailyClose: '22:00', status: 'publicada',
    description: 'Próxima edição com pavilhão ampliado e arena de competições.',
  };
  const d = (i: number) => ymd(addDays(s1Start, i));
  const ev = (id: string, day: number, start: string, end: string, title: string, type: ScheduleEvent['type'], location: string, description: string, brandId: string | null = null): ScheduleEvent => ({
    id, seasonId: S1.id, title, type, brandId, location, start: atTime(d(day), start).toISOString(), end: atTime(d(day), end).toISOString(), description,
  });
  const events: ScheduleEvent[] = [
    ev('e1', 0, '10:00', '10:45', 'Abertura oficial da Temporada 01', 'especial', 'Palco Principal', 'Cerimônia de abertura e apresentação dos expositores.'),
    ev('e2', 0, '14:00', '14:40', 'Lançamento: ISO WHEY BLACK', 'lancamento', 'Palco Principal', 'Apresentação ao vivo do novo whey isolado.', 'b-ironcore'),
    ev('e3', 0, '18:00', '22:00', 'Happy Hour de Pré-treinos: 15% OFF', 'promocao', 'Estande VOLTA', 'Desconto progressivo durante o horário.', 'b-volta'),
    ev('e4', 1, '11:00', '12:00', 'Painel: Creatina — mitos e ciência', 'palestra', 'Palco Principal', 'Debate com especialistas convidados.', 'b-primeforge'),
    ev('e5', 1, '16:00', '17:00', 'Lançamento: VOLTA SURGE 2.0', 'lancamento', 'Palco Principal', 'Demonstração ao vivo.', 'b-volta'),
    ev('e6', 2, '15:00', '16:30', 'Desafio de Supino Virtual', 'competicao', 'Arena', 'Competição entre atletas convidados (transmissão).'),
    ev('e7', 2, '19:00', '20:00', 'Talk: Proteína vegetal para hipertrofia', 'palestra', 'Palco Principal', 'Com a equipe PURE ROOTS.', 'b-pureroots'),
    ev('e8', 3, '10:00', '22:00', 'Dia do Kit: kits com até 25% OFF', 'promocao', 'Todos os estandes', 'Condições especiais em kits.'),
    ev('e9', 4, '20:00', '21:00', 'Encerramento e premiação dos expositores', 'especial', 'Palco Principal', 'Resultados da temporada.'),
  ];
  const sponsors: Sponsor[] = [
    { id: 'sp1', seasonId: S1.id, name: 'ATLAS Bank (fictício)', tier: 'diamante', value: 120000, placements: ['Arco de entrada', 'Telão do palco', 'Naming do Palco Principal'], contractStatus: 'assinado' },
    { id: 'sp2', seasonId: S1.id, name: 'FlexPay (fictício)', tier: 'ouro', value: 60000, placements: ['Totens do lobby', 'Checkout'], contractStatus: 'assinado' },
    { id: 'sp3', seasonId: S1.id, name: 'SmartGym Network (fictício)', tier: 'prata', value: 25000, placements: ['Banner suspenso Corredor B'], contractStatus: 'proposta' },
  ];
  return { seasons: [S1, S2], events, sponsors };
}

const MONETIZATION: MonetizationConfig = {
  currency: 'BRL',
  participationFee: { standard: 8900, premium: 18500, master: 34000 },
  sponsorshipPrice: { diamante: 120000, ouro: 60000, prata: 25000 },
  commissionRate: 8,
  brandCommissionOverrides: { 'b-ironcore': 6.5 },
  adSlots: [
    { id: 'ad1', name: 'Telão suspenso — Boulevard', location: 'boulevard', pricePerDay: 4500, advertiser: 'ATLAS Bank (fictício)', message: 'Conta PJ para marcas fitness — patrocinador oficial', active: true },
    { id: 'ad2', name: 'Telão do Palco — intervalos', location: 'palco', pricePerDay: 9000, advertiser: 'FlexPay (fictício)', message: 'Parcele suas compras da feira', active: true },
    { id: 'ad3', name: 'Totem do Lobby', location: 'lobby', pricePerDay: 1800, advertiser: null, message: 'Espaço disponível para anunciantes', active: true },
    { id: 'ad4', name: 'Banner suspenso — Corredor B', location: 'corredor-b', pricePerDay: 2500, advertiser: 'SmartGym Network (fictício)', message: 'A maior rede de academias inteligentes', active: true },
  ],
};

export function createSeedState(): ExpoState {
  const { seasons: ss, events, sponsors } = seasons();
  const createdAt = now();
  return {
    version: STATE_VERSION,
    brands: BRANDS.map((b) => ({ ...b, createdAt, seasonIds: b.status === 'aprovada' ? ['season-01'] : [] })),
    products: PRODUCTS,
    sellers: SELLERS,
    seasons: ss,
    events,
    sponsors,
    orders: [],
    analytics: [],
    monetization: MONETIZATION,
    activeSeasonId: 'season-01',
  };
}
