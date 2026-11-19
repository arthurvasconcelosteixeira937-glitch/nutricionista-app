import type { AnalyticsEvent, Order } from '@/domain/types';

export function summarize(analytics: AnalyticsEvent[], orders: Order[]) {
  const valid = orders.filter((o) => o.status !== 'cancelado');
  const visitors = new Set(analytics.map((a) => a.visitorId)).size;
  const count = (t: AnalyticsEvent['type']) => analytics.filter((a) => a.type === t).length;
  const uniq = (t: AnalyticsEvent['type']) => new Set(analytics.filter((a) => a.type === t).map((a) => a.visitorId)).size;
  const revenue = valid.reduce((a, o) => a + o.total, 0);
  const subtotal = valid.reduce((a, o) => a + o.subtotal, 0);
  const commission = valid.reduce((a, o) => a + o.commissionValue, 0);
  const buyers = new Set(valid.map((o) => o.visitorId)).size;
  return {
    visitors,
    sessions: count('sessao'),
    boothVisits: count('visita_estande'),
    boothVisitors: uniq('visita_estande'),
    productViews: count('produto_visto'),
    productViewers: uniq('produto_visto'),
    callRequests: count('chamada_solicitada'),
    callsConnected: count('chamada_conectada'),
    cartAdds: count('carrinho_adicionado'),
    cartUsers: uniq('carrinho_adicionado'),
    orders: valid.length,
    buyers,
    revenue,
    subtotal,
    commission,
    avgTicket: valid.length ? revenue / valid.length : 0,
    conversion: visitors ? (buyers / visitors) * 100 : 0,
    hasDemo: analytics.some((a) => a.isDemo) || orders.some((o) => o.isDemo),
  };
}

export function topProducts(orders: Order[], limit = 5) {
  const m = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of orders) {
    if (o.status === 'cancelado') continue;
    for (const l of o.lines) {
      const cur = m.get(l.productId) ?? { name: l.name, qty: 0, revenue: 0 };
      cur.qty += l.qty;
      cur.revenue += l.qty * l.unitPrice;
      m.set(l.productId, cur);
    }
  }
  return [...m.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export const orderStatusLabel: Record<Order['status'], string> = {
  aguardando_marca: 'Aguardando marca',
  confirmado: 'Confirmado',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const analyticsLabel: Record<AnalyticsEvent['type'], string> = {
  sessao: 'Entrou na feira',
  visita_estande: 'Visitou o estande',
  produto_visto: 'Viu produto',
  chamada_solicitada: 'Pediu atendimento por voz',
  chamada_conectada: 'Conversou por voz',
  carrinho_adicionado: 'Adicionou ao carrinho',
  pedido: 'Fez pedido',
};
