import { Link, NavLink } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { Logo } from './ui';
import { useCart } from '@/services/commerce';

export function SiteHeader() {
  const cart = useCart();
  const count = cart.reduce((a, b) => a + b.qty, 0);
  const nav = [
    { to: '/programacao', label: 'Programação' },
    { to: '/expor', label: 'Para marcas' },
    { to: '/empresa', label: 'Painel da empresa' },
    { to: '/admin', label: 'Administração' },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/carrinho" className="relative rounded-xl border border-white/10 p-2.5 text-zinc-300 hover:text-white" aria-label="Carrinho">
            <ShoppingBag size={18} />
            {count > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold-400 px-1 text-[11px] font-bold text-ink-950">{count}</span>}
          </Link>
          <Link to="/feira" className="btn-gold hidden sm:inline-flex">Entrar na feira</Link>
        </div>
      </div>
      <nav className="no-scrollbar flex gap-1 overflow-x-auto border-t border-white/[0.04] px-3 py-1.5 md:hidden">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${isActive ? 'bg-white/10 text-white' : 'text-zinc-400'}`}>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-ink-950">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-zinc-500">
            Feira comercial virtual em 3D para o mercado de suplementação, nutrição esportiva e fitness. Protótipo (MVP) — marcas e
            dados exibidos são fictícios e servem apenas para demonstração.
          </p>
        </div>
        <div className="text-sm">
          <p className="eyebrow mb-3">Plataforma</p>
          <ul className="space-y-2 text-zinc-400">
            <li><Link className="hover:text-white" to="/feira">Pavilhão 3D</Link></li>
            <li><Link className="hover:text-white" to="/programacao">Temporadas e programação</Link></li>
            <li><Link className="hover:text-white" to="/carrinho">Carrinho</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="eyebrow mb-3">Negócios</p>
          <ul className="space-y-2 text-zinc-400">
            <li><Link className="hover:text-white" to="/expor">Expor na feira</Link></li>
            <li><Link className="hover:text-white" to="/empresa">Painel da empresa</Link></li>
            <li><Link className="hover:text-white" to="/admin">Administração</Link></li>
            <li><Link className="hover:text-white" to="/status">Status das integrações</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
