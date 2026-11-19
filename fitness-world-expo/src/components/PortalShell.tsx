import type { ReactNode } from 'react';
import { NavLink, Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { LogOut, Box } from 'lucide-react';
import { Logo } from './ui';

export interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }

export function PortalShell({ title, subtitle, accent, nav, onSignOut, children, badge }: {
  title: string; subtitle: string; accent?: string; nav: NavItem[]; onSignOut: () => void; children: ReactNode; badge?: ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-white/[0.06] bg-ink-900/70 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-4 lg:block">
          <Logo />
          <div className="mt-0 flex items-center gap-2 lg:mt-6">
            <span className="hidden h-9 w-1.5 rounded lg:block" style={{ background: accent ?? '#e9c46a' }} />
            <div className="hidden min-w-0 lg:block">
              <p className="truncate text-sm font-semibold text-white">{title}</p>
              <p className="truncate text-xs text-zinc-500">{subtitle}</p>
            </div>
          </div>
        </div>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-0">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-white/[0.07] text-white' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white'}`
              }
            >
              <n.icon size={16} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden space-y-2 p-4 lg:absolute lg:bottom-0 lg:block lg:w-full">
          {badge}
          <Link to="/feira" className="btn-ghost w-full"><Box size={15} /> Abrir pavilhão 3D</Link>
          <button className="btn-ghost w-full text-zinc-400" onClick={onSignOut}><LogOut size={15} /> Sair</button>
        </div>
      </aside>
      <main className="min-w-0">
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3 lg:hidden">
          <p className="truncate text-sm font-semibold">{title}</p>
          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={onSignOut}><LogOut size={13} /> Sair</button>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">{children}</div>
      </main>
    </div>
  );
}

export function PageTitle({ eyebrow, title, children, actions }: { eyebrow?: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-3xl font-bold uppercase tracking-wide text-white sm:text-4xl">{title}</h1>
        {children && <div className="mt-1 max-w-2xl text-sm text-zinc-400">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
