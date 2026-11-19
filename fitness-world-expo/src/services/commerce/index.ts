import { useSyncExternalStore } from 'react';
import type { CartItem, Order } from '@/domain/types';
import { getState, setState } from '@/data/store';
import { track } from '@/data/repositories';
import { uid } from '@/lib/util';

// ---------------------------------------------------------------------------
// Contratos de integração (o que o backend real deverá implementar)
// ---------------------------------------------------------------------------

export interface CheckoutCustomer {
  name: string; email: string; phone: string; document: string; cep: string; address: string; city: string;
}

export type PaymentMethod = 'pix' | 'cartao' | 'boleto';

/** Provedor de pagamento. Em produção: gateway com split por marca (ex.: Pagar.me, Mercado Pago, Stripe Connect). */
export interface PaymentProvider {
  readonly id: string;
  readonly isSimulated: boolean;
  authorize(input: { orderCode: string; amount: number; method: PaymentMethod }): Promise<{ status: 'simulado' }>;
}

/** Encaminhamento do pedido para a marca. Em produção: webhook/ERP/plataforma da marca (VTEX, Shopify, Nuvemshop...). */
export interface OrderRouter {
  readonly id: string;
  readonly isSimulated: boolean;
  forward(order: Order): Promise<void>;
}

// ---------------------------------------------------------------------------
// Implementações do protótipo — SIMULADAS e identificadas como tal
// ---------------------------------------------------------------------------

export const simulatedPayment: PaymentProvider = {
  id: 'simulado',
  isSimulated: true,
  async authorize() {
    // Nenhuma cobrança é realizada. Não há comunicação com gateway.
    await new Promise((r) => setTimeout(r, 900));
    return { status: 'simulado' };
  },
};

export const localOrderRouter: OrderRouter = {
  id: 'painel-local',
  isSimulated: true,
  async forward() {
    // O pedido fica disponível no Painel da Empresa (armazenamento local).
    // Não há envio para sistemas externos da marca.
  },
};

// ---------------------------------------------------------------------------
// Carrinho (por navegador)
// ---------------------------------------------------------------------------

const CKEY = 'fwe:cart';
const listeners = new Set<() => void>();
let cart: CartItem[] = readCart();
let cartRaw = JSON.stringify(cart);

function readCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(CKEY) || '[]');
  } catch {
    return [];
  }
}
function saveCart(next: CartItem[]) {
  cart = next.filter((i) => i.qty > 0);
  cartRaw = JSON.stringify(cart);
  try { localStorage.setItem(CKEY, cartRaw); } catch { /* ignora */ }
  listeners.forEach((l) => l());
}
window.addEventListener('storage', (e) => {
  if (e.key === CKEY) {
    cart = readCart();
    cartRaw = JSON.stringify(cart);
    listeners.forEach((l) => l());
  }
});

export function useCart(): CartItem[] {
  useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => cartRaw);
  return cart;
}

export const cartActions = {
  add(productId: string, visitorId: string, qty = 1) {
    const p = getState().products.find((x) => x.id === productId);
    if (!p) return;
    const ex = cart.find((i) => i.productId === productId);
    saveCart(ex ? cart.map((i) => (i.productId === productId ? { ...i, qty: Math.min(20, i.qty + qty) } : i)) : [...cart, { productId, brandId: p.brandId, qty }]);
    track('carrinho_adicionado', visitorId, { brandId: p.brandId, productId });
  },
  setQty(productId: string, qty: number) {
    saveCart(cart.map((i) => (i.productId === productId ? { ...i, qty: Math.max(0, Math.min(20, qty)) } : i)));
  },
  remove(productId: string) {
    saveCart(cart.filter((i) => i.productId !== productId));
  },
  clear() {
    saveCart([]);
  },
};

export function shippingFor(subtotal: number) {
  // Regra demonstrativa: frete fixo por marca, grátis acima de R$ 299.
  return subtotal >= 299 ? 0 : 19.9;
}

export function cartByBrand(items: CartItem[]) {
  const st = getState();
  const groups = new Map<string, { brandId: string; lines: { product: (typeof st.products)[number]; qty: number }[]; subtotal: number }>();
  for (const it of items) {
    const product = st.products.find((p) => p.id === it.productId);
    if (!product) continue;
    const g = groups.get(it.brandId) ?? { brandId: it.brandId, lines: [], subtotal: 0 };
    g.lines.push({ product, qty: it.qty });
    g.subtotal += (product.promoPrice ?? product.price) * it.qty;
    groups.set(it.brandId, g);
  }
  return [...groups.values()];
}

/**
 * Finaliza a compra: gera UM PEDIDO POR MARCA (cada marca é responsável por
 * pagamento, estoque e entrega). Pagamento SIMULADO.
 */
export async function placeOrders(customer: CheckoutCustomer, method: PaymentMethod, visitorId: string): Promise<Order[]> {
  const st = getState();
  const groups = cartByBrand(cart);
  const created: Order[] = [];
  for (const g of groups) {
    const code = `FWE-${Date.now().toString(36).toUpperCase().slice(-5)}-${g.brandId.slice(-3).toUpperCase()}`;
    const shipping = shippingFor(g.subtotal);
    const total = +(g.subtotal + shipping).toFixed(2);
    await simulatedPayment.authorize({ orderCode: code, amount: total, method });
    const rate = st.monetization.brandCommissionOverrides[g.brandId] ?? st.monetization.commissionRate;
    const order: Order = {
      id: uid('o-'), code, brandId: g.brandId, seasonId: st.activeSeasonId, visitorId, customer,
      lines: g.lines.map((l) => ({ productId: l.product.id, name: l.product.name, unitPrice: l.product.promoPrice ?? l.product.price, qty: l.qty })),
      subtotal: +g.subtotal.toFixed(2), shipping, total, commissionRate: rate, commissionValue: +((g.subtotal * rate) / 100).toFixed(2),
      paymentMethod: method, paymentStatus: 'simulado', status: 'aguardando_marca', createdAt: new Date().toISOString(), isDemo: false,
    };
    await localOrderRouter.forward(order);
    created.push(order);
  }
  setState((s) => ({ ...s, orders: [...s.orders, ...created] }));
  created.forEach((o) => track('pedido', visitorId, { brandId: o.brandId }));
  cartActions.clear();
  return created;
}
