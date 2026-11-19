import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, MapPin, Mic, Minus, Navigation, Plus, ShoppingBag, Sparkles, Trash2 } from 'lucide-react';
import type { Brand, ExpoState, Product, Seller } from '@/domain/types';
import { Badge, Empty, IntegrationTag, Modal } from '@/components/ui';
import { HallMap } from '@/components/HallMap';
import { cartActions, cartByBrand, shippingFor, useCart } from '@/services/commerce';
import { fmtDate, fmtTime, money } from '@/lib/util';
import { activeSeason } from '@/services/season';

export function Price({ p, big = false }: { p: Product; big?: boolean }) {
  const has = p.promoPrice != null && p.promoPrice < p.price;
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className={`${big ? 'text-3xl' : 'text-base'} font-display font-bold text-white`}>{money(has ? p.promoPrice! : p.price)}</span>
      {has && <span className={`${big ? 'text-base' : 'text-xs'} text-zinc-500 line-through`}>{money(p.price)}</span>}
    </span>
  );
}

function ProductSwatch({ p, brand }: { p: Product; brand?: Brand }) {
  const shapeH = p.shape === 'caixa' ? 'h-14 w-20 rounded-md' : p.shape === 'refil' ? 'h-20 w-14 rounded-md' : p.shape === 'garrafa' ? 'h-20 w-10 rounded-t-[14px] rounded-b-md' : p.shape === 'shaker' ? 'h-20 w-12 rounded-b-xl rounded-t-md' : 'h-20 w-16 rounded-lg';
  return (
    <div className="grid h-28 w-28 shrink-0 place-items-center rounded-2xl" style={{ background: `radial-gradient(circle at 50% 30%, ${brand?.booth.primaryColor ?? '#222'}55, #0b0d12)` }}>
      <div className={`${shapeH} relative overflow-hidden shadow-xl`} style={{ background: `linear-gradient(160deg, ${p.color}, ${p.color}aa)` }}>
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2" style={{ background: brand?.booth.secondaryColor }} />
      </div>
    </div>
  );
}

export function ProductModal({ product, brand, sellers, onlineIds, onClose, onAdded, onGoBooth, onTalk }: {
  product: Product | null; brand?: Brand; sellers: Seller[]; onlineIds: Set<string>; onClose: () => void; onAdded: (p: Product, qty: number) => void; onGoBooth: () => void; onTalk: (s: Seller) => void;
}) {
  const [qty, setQty] = useState(1);
  if (!product) return null;
  const online = sellers.filter((s) => onlineIds.has(s.id));
  return (
    <Modal open={!!product} onClose={onClose} title={<span className="flex items-center gap-2">{brand?.name} {product.isLaunch && <Badge tone="gold"><Sparkles size={11} /> Lançamento</Badge>}</span>}>
      <div className="flex gap-4">
        <ProductSwatch p={product} brand={brand} />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-zinc-500">{product.category} · {product.size}</p>
          <h3 className="mt-1 font-display text-3xl font-bold uppercase leading-none text-white">{product.name}</h3>
          <div className="mt-3"><Price p={product} big /></div>
          <p className="mt-1 text-xs text-zinc-500">{product.inStock ? 'Em estoque na marca' : 'Indisponível no momento'}</p>
        </div>
      </div>
      <p className="mt-5 text-sm leading-relaxed text-zinc-300">{product.description}</p>
      {product.features.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {product.features.map((f) => (
            <li key={f} className="flex items-start gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-sm text-zinc-300"><Check size={15} className="mt-0.5 shrink-0 text-emerald-400" /> {f}</li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-xl border border-white/10">
          <button className="p-2.5 text-zinc-300" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Menos"><Minus size={16} /></button>
          <span className="w-8 text-center font-semibold">{qty}</span>
          <button className="p-2.5 text-zinc-300" onClick={() => setQty(Math.min(20, qty + 1))} aria-label="Mais"><Plus size={16} /></button>
        </div>
        <button className="btn-gold flex-1" disabled={!product.inStock} onClick={() => onAdded(product, qty)}>
          <ShoppingBag size={16} /> Adicionar ao carrinho
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {online.length > 0 ? (
          online.map((s) => (
            <button key={s.id} className="btn-ghost" onClick={() => onTalk(s)}><Mic size={15} className="text-emerald-400" /> Falar com {s.name.split(' ')[0]}</button>
          ))
        ) : (
          <p className="text-xs text-zinc-500">Nenhum vendedor desta marca está online agora.</p>
        )}
        <button className="btn-ghost" onClick={onGoBooth}><Navigation size={15} /> Ir ao estande</button>
      </div>
    </Modal>
  );
}

export function BoothPanel({ brand, st, onlineIds, shiftLabel, onClose, onProduct, onTalk, onGo }: {
  brand: Brand | null; st: ExpoState; onlineIds: Set<string>; shiftLabel: (s: Seller) => string; onClose: () => void; onProduct: (p: Product) => void; onTalk: (s: Seller) => void; onGo: () => void;
}) {
  if (!brand) return null;
  const products = st.products.filter((p) => p.brandId === brand.id);
  const sellers = st.sellers.filter((s) => s.brandId === brand.id && s.active);
  const events = st.events.filter((e) => e.brandId === brand.id);
  return (
    <Modal open onClose={onClose} wide title={<span className="flex items-center gap-2">Estande {brand.slotId} · {brand.name} <Badge tone={brand.tier === 'master' ? 'gold' : brand.tier === 'premium' ? 'violet' : 'zinc'}>{brand.tier}</Badge></span>}>
      <div className="rounded-2xl p-5" style={{ background: `linear-gradient(120deg, ${brand.booth.primaryColor}, #0b0d12 70%)` }}>
        <p className="font-display text-4xl font-extrabold tracking-wider" style={{ color: brand.booth.secondaryColor }}>{brand.booth.logoText}</p>
        <p className="mt-1 text-xs tracking-[0.3em] text-white/70">{brand.booth.tagline}</p>
        <p className="mt-3 max-w-2xl text-sm text-white/80">{brand.description}</p>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <p className="eyebrow mb-3">Catálogo ({products.length})</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {products.map((p) => (
              <button key={p.id} onClick={() => onProduct(p)} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition hover:border-white/15">
                <span className="h-10 w-3 shrink-0 rounded" style={{ background: p.color, boxShadow: `inset 0 -6px 0 ${brand.booth.secondaryColor}` }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{p.name}</span>
                  <span className="block text-xs text-zinc-500">{p.size}{p.isLaunch ? ' · Lançamento' : ''}</span>
                </span>
                <Price p={p} />
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <div>
            <p className="eyebrow mb-3">Atendimento</p>
            <div className="space-y-2">
              {sellers.length === 0 && <p className="text-sm text-zinc-500">Nenhum vendedor cadastrado.</p>}
              {sellers.map((s) => {
                const on = onlineIds.has(s.id);
                return (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${on ? 'bg-emerald-400 pulse-ring' : 'bg-zinc-600'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{s.name}</p>
                      <p className="truncate text-xs text-zinc-500">{s.title} · {on ? 'Online agora' : shiftLabel(s)}</p>
                    </div>
                    <button className={on ? 'btn-gold px-3 py-1.5 text-xs' : 'btn-ghost px-3 py-1.5 text-xs'} disabled={!on} onClick={() => onTalk(s)}><Mic size={13} /> Falar</button>
                  </div>
                );
              })}
            </div>
          </div>
          {events.length > 0 && (
            <div>
              <p className="eyebrow mb-3">Na programação</p>
              {events.map((e) => (
                <p key={e.id} className="text-sm text-zinc-300">• {fmtDate(e.start, { day: '2-digit', month: 'short' })} {fmtTime(e.start)} — {e.title}</p>
              ))}
            </div>
          )}
          <button className="btn-ghost w-full" onClick={onGo}><Navigation size={15} /> Caminhar até o estande</button>
        </div>
      </div>
    </Modal>
  );
}

export function DirectoryModal({ open, st, pose, onlineSellers, onClose, onGoBrand, onGoStage, onGoLobby, onOpenBrand }: {
  open: boolean; st: ExpoState; pose: { x: number; z: number; yaw: number } | null; onlineSellers: { x: number; z: number; brandId?: string }[];
  onClose: () => void; onGoBrand: (id: string) => void; onGoStage: () => void; onGoLobby: () => void; onOpenBrand: (id: string) => void;
}) {
  const brands = st.brands.filter((b) => b.status === 'aprovada' && b.slotId).sort((a, b) => (a.slotId! < b.slotId! ? -1 : 1));
  return (
    <Modal open={open} onClose={onClose} wide title="Diretório de expositores">
      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="card p-3">
          <HallMap
            brands={st.brands}
            player={pose}
            sellersOnline={onlineSellers}
            className="h-[360px] w-full"
            onSlotClick={(slot) => {
              const b = brands.find((x) => x.slotId === slot);
              if (b) onGoBrand(b.id);
            }}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="btn-ghost px-3 py-1.5 text-xs" onClick={onGoLobby}><MapPin size={13} /> Lobby</button>
            <button className="btn-ghost px-3 py-1.5 text-xs" onClick={onGoStage}><MapPin size={13} /> Palco Principal</button>
          </div>
        </div>
        <div className="space-y-2">
          {brands.map((b) => {
            const on = onlineSellers.filter((s) => s.brandId === b.id).length;
            return (
              <div key={b.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg font-display text-sm font-bold" style={{ background: b.booth.primaryColor, color: b.booth.secondaryColor, border: `1px solid ${b.booth.secondaryColor}55` }}>{b.slotId}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{b.name}</p>
                  <p className="truncate text-xs text-zinc-500">{b.segment} · {on ? <span className="text-emerald-400">{on} vendedor(es) online</span> : 'vendedores offline'}</p>
                </div>
                <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => onOpenBrand(b.id)}>Catálogo</button>
                <button className="btn-gold px-3 py-1.5 text-xs" onClick={() => onGoBrand(b.id)}>Ir</button>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

export function ScheduleModal({ open, st, onClose }: { open: boolean; st: ExpoState; onClose: () => void }) {
  const season = activeSeason(st)!;
  const events = st.events.filter((e) => e.seasonId === season.id).sort((a, b) => a.start.localeCompare(b.start));
  const now = Date.now();
  return (
    <Modal open={open} onClose={onClose} title={`Programação · ${season.name}`}>
      <div className="space-y-2">
        {events.map((e) => {
          const live = new Date(e.start).getTime() <= now && new Date(e.end).getTime() >= now;
          const past = new Date(e.end).getTime() < now;
          return (
            <div key={e.id} className={`flex gap-3 rounded-xl border p-3 ${live ? 'border-red-400/40 bg-red-400/[0.05]' : 'border-white/[0.06] bg-white/[0.02]'} ${past ? 'opacity-50' : ''}`}>
              <div className="w-16 shrink-0 text-center">
                <p className="font-display text-xl font-bold">{fmtTime(e.start)}</p>
                <p className="text-[10px] uppercase text-zinc-500">{fmtDate(e.start, { day: '2-digit', month: 'short' })}</p>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{e.title} {live && <Badge tone="red">AO VIVO</Badge>}</p>
                <p className="text-xs text-zinc-500">{e.location} · {e.description}</p>
              </div>
            </div>
          );
        })}
      </div>
      <Link to="/programacao" className="btn-ghost mt-4 w-full">Abrir página de programação</Link>
    </Modal>
  );
}

export function CartDrawer({ open, st, onClose }: { open: boolean; st: ExpoState; onClose: () => void }) {
  const cart = useCart();
  const groups = cartByBrand(cart);
  const total = groups.reduce((a, g) => a + g.subtotal + shippingFor(g.subtotal), 0);
  return (
    <Modal open={open} onClose={onClose} title={<span className="flex items-center gap-2">Carrinho <IntegrationTag kind="simulado" /></span>}>
      {groups.length === 0 ? (
        <Empty title="Seu carrinho está vazio">Visite os estandes e adicione produtos.</Empty>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const b = st.brands.find((x) => x.id === g.brandId);
            return (
              <div key={g.brandId} className="rounded-xl border border-white/[0.06] p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: b?.booth.secondaryColor }}>{b?.name} · pedido separado</p>
                {g.lines.map((l) => (
                  <div key={l.product.id} className="flex items-center gap-2 py-1.5">
                    <span className="min-w-0 flex-1 truncate text-sm">{l.product.name}</span>
                    <div className="flex items-center rounded-lg border border-white/10">
                      <button className="p-1" onClick={() => cartActions.setQty(l.product.id, l.qty - 1)} aria-label="Menos"><Minus size={13} /></button>
                      <span className="w-6 text-center text-sm">{l.qty}</span>
                      <button className="p-1" onClick={() => cartActions.setQty(l.product.id, l.qty + 1)} aria-label="Mais"><Plus size={13} /></button>
                    </div>
                    <span className="w-24 text-right text-sm font-semibold">{money((l.product.promoPrice ?? l.product.price) * l.qty)}</span>
                    <button className="p-1 text-zinc-500 hover:text-red-300" onClick={() => cartActions.remove(l.product.id)} aria-label="Remover"><Trash2 size={14} /></button>
                  </div>
                ))}
                <p className="mt-1 text-right text-xs text-zinc-500">Frete da marca: {shippingFor(g.subtotal) ? money(shippingFor(g.subtotal)) : 'grátis'}</p>
              </div>
            );
          })}
          <div className="flex items-center justify-between border-t border-white/10 pt-3">
            <span className="text-zinc-400">Total</span>
            <span className="font-display text-2xl font-bold">{money(total)}</span>
          </div>
          <Link to="/carrinho" className="btn-gold w-full">Finalizar compra</Link>
          <p className="text-center text-[11px] text-zinc-500">Cada marca recebe e processa o seu próprio pedido.</p>
        </div>
      )}
    </Modal>
  );
}
