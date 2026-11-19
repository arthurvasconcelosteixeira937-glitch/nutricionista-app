import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, CreditCard, Loader2, Minus, Plus, QrCode, Receipt, Trash2 } from 'lucide-react';
import { useExpo } from '@/data/store';
import type { Order } from '@/domain/types';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { Empty, Field, IntegrationTag, Notice } from '@/components/ui';
import { cartActions, cartByBrand, placeOrders, shippingFor, useCart, type CheckoutCustomer, type PaymentMethod } from '@/services/commerce';
import { getVisitor } from '@/services/auth';
import { money } from '@/lib/util';

export default function CheckoutPage() {
  const st = useExpo();
  const cart = useCart();
  const groups = cartByBrand(cart);
  const [c, setC] = useState<CheckoutCustomer>({ name: '', email: '', phone: '', document: '', cep: '', address: '', city: '' });
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Order[] | null>(null);
  const total = groups.reduce((a, g) => a + g.subtotal + shippingFor(g.subtotal), 0);
  const set = (k: keyof CheckoutCustomer, v: string) => setC((x) => ({ ...x, [k]: v }));
  const valid = c.name.trim().length > 2 && /\S+@\S+\.\S+/.test(c.email) && c.cep.replace(/\D/g, '').length === 8 && c.address.trim() && c.city.trim();

  const submit = async () => {
    setBusy(true);
    try {
      const orders = await placeOrders(c, method, getVisitor().id);
      setDone(orders);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {done ? (
          <div className="mx-auto max-w-xl text-center">
            <CheckCircle2 size={56} className="mx-auto text-emerald-400" />
            <h1 className="mt-4 font-display text-4xl font-bold uppercase">Pedido registrado</h1>
            <p className="mt-2 text-zinc-400">Seu carrinho gerou {done.length} pedido(s), um para cada marca. Cada marca confirma o pagamento, separa o estoque e envia.</p>
            <div className="mt-6 space-y-2 text-left">
              {done.map((o) => (
                <div key={o.id} className="card flex items-center justify-between p-4">
                  <div><p className="font-mono text-sm text-gold-300">{o.code}</p><p className="text-sm text-zinc-400">{st.brands.find((b) => b.id === o.brandId)?.name}</p></div>
                  <p className="font-semibold">{money(o.total)}</p>
                </div>
              ))}
            </div>
            <div className="mt-6"><Notice title="Pagamento simulado">Nenhum valor foi cobrado. Em produção, o pagamento é processado pelo gateway com repasse para a marca e o pedido é enviado ao sistema dela.</Notice></div>
            <div className="mt-6 flex justify-center gap-2"><Link to="/feira" className="btn-gold">Voltar ao pavilhão</Link><Link to="/" className="btn-ghost">Início</Link></div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-4xl font-bold uppercase">Finalizar compra</h1>
              <IntegrationTag kind="simulado" />
            </div>
            {groups.length === 0 ? (
              <div className="mt-8"><Empty title="Seu carrinho está vazio"><Link to="/feira" className="text-gold-300 underline">Visite os estandes</Link> e adicione produtos.</Empty></div>
            ) : (
              <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <div className="space-y-5">
                  <section className="card space-y-3 p-5">
                    <p className="eyebrow">Seus dados</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Nome completo"><input className="input" value={c.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" /></Field>
                      <Field label="E-mail"><input className="input" type="email" value={c.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" /></Field>
                      <Field label="Telefone"><input className="input" value={c.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" /></Field>
                      <Field label="CPF (opcional no protótipo)"><input className="input" value={c.document} onChange={(e) => set('document', e.target.value)} /></Field>
                    </div>
                  </section>
                  <section className="card space-y-3 p-5">
                    <p className="eyebrow">Entrega</p>
                    <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                      <Field label="CEP"><input className="input" inputMode="numeric" value={c.cep} onChange={(e) => set('cep', e.target.value.replace(/[^\d-]/g, '').slice(0, 9))} placeholder="00000-000" /></Field>
                      <Field label="Endereço e número"><input className="input" value={c.address} onChange={(e) => set('address', e.target.value)} autoComplete="street-address" /></Field>
                    </div>
                    <Field label="Cidade / UF"><input className="input" value={c.city} onChange={(e) => set('city', e.target.value)} /></Field>
                    <p className="text-[11px] text-zinc-500">Consulta automática de CEP e cálculo real de frete: integração pendente. Regra demonstrativa: R$ 19,90 por marca, grátis acima de R$ 299.</p>
                  </section>
                  <section className="card space-y-3 p-5">
                    <p className="eyebrow">Pagamento</p>
                    <div className="grid grid-cols-3 gap-2">
                      {([['pix', 'Pix', QrCode], ['cartao', 'Cartão', CreditCard], ['boleto', 'Boleto', Receipt]] as const).map(([v, l, Icon]) => (
                        <button key={v} onClick={() => setMethod(v)} className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-sm ${method === v ? 'border-gold-400/60 bg-gold-400/[0.06]' : 'border-white/10'}`}><Icon size={18} /> {l}</button>
                      ))}
                    </div>
                    <Notice title="Ambiente de demonstração">O pagamento será <b>simulado</b>: nenhum dado de cartão é solicitado e nenhuma cobrança é feita. Integração com gateway (ex.: Pagar.me, Mercado Pago, Stripe) com split por marca: pendente.</Notice>
                  </section>
                </div>
                <div className="lg:sticky lg:top-24 lg:self-start">
                  <div className="card p-5">
                    <p className="eyebrow">Resumo — {groups.length} pedido(s) separados por marca</p>
                    <div className="mt-4 space-y-4">
                      {groups.map((g) => {
                        const b = st.brands.find((x) => x.id === g.brandId);
                        const ship = shippingFor(g.subtotal);
                        return (
                          <div key={g.brandId} className="rounded-xl border border-white/[0.06] p-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: b?.booth.secondaryColor }}>{b?.name}</p>
                            {g.lines.map((l) => (
                              <div key={l.product.id} className="flex items-center gap-2 py-1">
                                <span className="min-w-0 flex-1 truncate text-sm">{l.product.name}</span>
                                <div className="flex items-center rounded-lg border border-white/10">
                                  <button className="p-1" onClick={() => cartActions.setQty(l.product.id, l.qty - 1)} aria-label="Menos"><Minus size={12} /></button>
                                  <span className="w-6 text-center text-sm">{l.qty}</span>
                                  <button className="p-1" onClick={() => cartActions.setQty(l.product.id, l.qty + 1)} aria-label="Mais"><Plus size={12} /></button>
                                </div>
                                <span className="w-20 text-right text-sm">{money((l.product.promoPrice ?? l.product.price) * l.qty)}</span>
                                <button className="text-zinc-500 hover:text-red-300" onClick={() => cartActions.remove(l.product.id)} aria-label="Remover"><Trash2 size={13} /></button>
                              </div>
                            ))}
                            <div className="mt-2 flex justify-between text-xs text-zinc-500"><span>Frete</span><span>{ship ? money(ship) : 'Grátis'}</span></div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4"><span className="text-zinc-400">Total</span><span className="font-display text-3xl font-bold">{money(total)}</span></div>
                    <button className="btn-gold mt-4 w-full py-3" disabled={!valid || busy} onClick={submit}>
                      {busy ? <><Loader2 size={16} className="animate-spin" /> Processando (simulado)…</> : 'Confirmar pedido (pagamento simulado)'}
                    </button>
                    {!valid && <p className="mt-2 text-center text-[11px] text-zinc-500">Preencha nome, e-mail, CEP (8 dígitos), endereço e cidade.</p>}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
