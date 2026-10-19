import { Home, Brain, BookOpenText, ShoppingBag, UserRound, ArrowLeft, Zap } from 'lucide-react'
import Logo from './Logo.jsx'
import WhatsAppFlutuante from './WhatsAppFlutuante.jsx'
import { navegar } from '../lib/router.js'
import { useStore } from '../lib/store.jsx'

const ABAS = [
  { rota: '/app', rotulo: 'Início', icone: Home },
  { rota: '/app/quizzes', rotulo: 'Quizzes', icone: Brain },
  { rota: '/app/resumos', rotulo: 'Resumos', icone: BookOpenText },
  { rota: '/app/loja', rotulo: 'Loja', icone: ShoppingBag },
  { rota: '/app/perfil', rotulo: 'Perfil', icone: UserRound },
]

// Moldura das telas do app: topo, conteúdo, barra de navegação embaixo e botão do WhatsApp.
export default function AppShell({ rota, children }) {
  const { xp, ofensivaAtiva } = useStore()
  const abaAtiva = ABAS.slice(1).find((a) => rota.startsWith(a.rota))?.rota || (rota === '/app' ? '/app' : null)

  return (
    <div className="min-h-screen bg-navy-50 pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 bg-navy/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2.5">
          <Logo compacto />
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1" title="Dias seguidos">
              🔥 {ofensivaAtiva}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-energia px-2.5 py-1 text-navy" title="Pontos de experiência">
              <Zap className="h-3.5 w-3.5" fill="currentColor" /> {xp}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-navy/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-2xl grid-cols-5">
          {ABAS.map((a) => {
            const ativa = abaAtiva === a.rota
            return (
              <button
                key={a.rota}
                onClick={() => navegar(a.rota)}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition ${ativa ? 'text-navy' : 'text-navy/45'}`}
              >
                <span className={`grid h-8 w-12 place-items-center rounded-full transition ${ativa ? 'bg-energia' : ''}`}>
                  <a.icone className="h-5 w-5" strokeWidth={ativa ? 2.6 : 2} />
                </span>
                {a.rotulo}
              </button>
            )
          })}
        </div>
      </nav>
      <WhatsAppFlutuante acimaDaNav />
    </div>
  )
}

// Cabeçalho de página interna com botão voltar.
export function CabecalhoPagina({ titulo, subtitulo, voltarPara = '/app', extra }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <button
        onClick={() => navegar(voltarPara)}
        className="-ml-1 mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-navy/10 active:scale-95"
        aria-label="Voltar"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-extrabold leading-tight">{titulo}</h1>
        {subtitulo && <p className="text-sm text-navy/60">{subtitulo}</p>}
      </div>
      {extra}
    </div>
  )
}
