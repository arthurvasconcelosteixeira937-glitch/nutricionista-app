import { Check, Lock, Flame, Sparkles, BookOpen } from 'lucide-react'
import { PLANOS } from '../data/planos.js'
import { EBOOKS, COMBO_EBOOKS } from '../data/ebooks.js'
import { FIM_OFERTA } from '../data/config.js'
import { formatarBRL } from '../lib/util.js'
import { partesDoTempo } from '../lib/datas.js'
import { useStore } from '../lib/store.jsx'
import { navegar } from '../lib/router.js'
import { useCheckout } from './Checkout.jsx'
import { useAgora } from './Contagem.jsx'
import EbookCapa from './EbookCapa.jsx'

// Faixa "Preço especial só até o 1º dia do ENEM" com contagem regressiva.
export function FaixaOferta() {
  const agora = useAgora()
  if (agora >= FIM_OFERTA) return null
  const t = partesDoTempo(FIM_OFERTA - agora)
  const p = (n) => String(n).padStart(2, '0')
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl bg-gradient-to-r from-energia to-amber-300 px-4 py-3 text-center text-navy shadow-lg shadow-energia/20">
      <span className="flex items-center gap-1 text-sm font-extrabold">
        <Flame className="h-4 w-4" /> Preço especial só até o 1º dia do ENEM
      </span>
      <span className="rounded-lg bg-navy px-2 py-0.5 font-mono text-sm font-bold tabular-nums text-energia">
        {t.dias}d {p(t.horas)}h {p(t.minutos)}m {p(t.segundos)}s
      </span>
    </div>
  )
}

// Cards dos 3 planos. `noApp` muda o botão do plano grátis (no app ele já está ativo).
export function CardsPlanos({ noApp = false }) {
  const abrirCheckout = useCheckout()
  const { usuario, plano: planoAtual, modoTeste } = useStore()

  const acaoGratis = () => navegar(usuario ? '/app' : '/entrar')

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PLANOS.map((plano) => {
        const destaque = plano.id === 'completo'
        const ativo = planoAtual === plano.id || (plano.id !== 'gratis' && modoTeste)
        return (
          <div
            key={plano.id}
            className={`relative flex flex-col rounded-3xl p-5 ${destaque ? 'bg-navy text-white ring-4 ring-energia md:-translate-y-2' : 'bg-white text-navy ring-1 ring-navy/10'}`}
          >
            {plano.selo && (
              <span
                className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-extrabold tracking-wide shadow ${destaque ? 'bg-energia text-navy' : 'bg-emerald-500 text-white'}`}
              >
                {destaque ? '⭐ ' : '💎 '}
                {plano.selo}
              </span>
            )}
            <h3 className="mt-1 text-lg font-extrabold">{plano.nome}</h3>
            <p className={`text-sm ${destaque ? 'text-white/70' : 'text-navy/60'}`}>{plano.descricao}</p>
            <div className="my-4">
              {plano.precoDe && <span className={`block text-sm line-through ${destaque ? 'text-white/50' : 'text-navy/40'}`}>de {formatarBRL(plano.precoDe)}</span>}
              <span className="text-4xl font-extrabold tracking-tight">{plano.preco === 0 ? 'R$ 0' : formatarBRL(plano.preco)}</span>
              {plano.preco > 0 && <span className={`ml-1 text-sm ${destaque ? 'text-white/70' : 'text-navy/60'}`}>à vista</span>}
            </div>
            <ul className="mb-5 flex-1 space-y-2 text-sm">
              {plano.itens.map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className={`mt-0.5 h-4 w-4 shrink-0 ${destaque ? 'text-energia' : 'text-emerald-500'}`} strokeWidth={3} /> {item}
                </li>
              ))}
              {plano.bloqueados.map((item) => (
                <li key={item} className="flex gap-2 opacity-50">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" /> {item}
                </li>
              ))}
            </ul>
            {plano.preco === 0 ? (
              <button onClick={acaoGratis} disabled={noApp} className="btn btn-claro w-full">
                {noApp ? (planoAtual === 'gratis' ? 'Seu plano atual' : 'Incluído') : 'Começar grátis'}
              </button>
            ) : ativo ? (
              <button disabled className="btn w-full bg-emerald-500 text-white">
                <Check className="h-5 w-5" /> Liberado
              </button>
            ) : (
              <button onClick={() => abrirCheckout(plano.id)} className={`btn w-full ${destaque ? 'btn-primario' : 'btn-escuro'}`}>
                <Sparkles className="h-5 w-5" /> Quero esse
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Vitrine dos e-books + combo.
export function VitrineEbooks() {
  const abrirCheckout = useCheckout()
  const { temEbook } = useStore()
  const temTodos = EBOOKS.every((e) => temEbook(e.id))
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {EBOOKS.map((e) => (
          <article key={e.id} className="flex flex-col rounded-3xl bg-white p-4 text-navy ring-1 ring-navy/10">
            <div className="flex gap-4 sm:flex-col">
              <div className="w-28 shrink-0 sm:mx-auto sm:w-40">
                <EbookCapa ebook={e} />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold leading-tight">{e.titulo}</h3>
                <p className="mt-1 text-sm text-navy/70">{e.descricao}</p>
              </div>
            </div>
            <ul className="mt-3 flex-1 space-y-1.5 text-sm">
              {e.topicos.map((t) => (
                <li key={t} className="flex gap-2">
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-energia-600" /> {t}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-2xl font-extrabold">{formatarBRL(e.preco)}</span>
              {temEbook(e.id) ? (
                <span className="flex items-center gap-1 rounded-xl bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-700">
                  <Check className="h-4 w-4" /> Liberado
                </span>
              ) : (
                <button onClick={() => abrirCheckout(e.id)} className="btn btn-escuro min-h-10 px-4 py-2 text-sm">
                  Comprar
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-energia to-amber-300 p-5 text-navy">
        <span className="absolute right-3 top-3 rounded-full bg-navy px-2.5 py-1 text-xs font-extrabold text-energia">
          -{Math.round((1 - COMBO_EBOOKS.preco / COMBO_EBOOKS.precoDe) * 100)}%
        </span>
        <div className="flex items-center gap-4">
          <div className="flex shrink-0 -space-x-6">
            {EBOOKS.map((e, i) => (
              <div key={e.id} className="w-14" style={{ transform: `rotate(${(i - 1) * 8}deg)` }}>
                <EbookCapa ebook={e} mini />
              </div>
            ))}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold leading-tight">{COMBO_EBOOKS.titulo}</h3>
            <p className="text-sm">
              de <s>{formatarBRL(COMBO_EBOOKS.precoDe)}</s> por <strong className="text-xl">{formatarBRL(COMBO_EBOOKS.preco)}</strong>
            </p>
          </div>
        </div>
        {temTodos ? (
          <p className="mt-4 flex items-center justify-center gap-1 rounded-2xl bg-white/60 py-3 font-bold">
            <Check className="h-5 w-5" /> Você já tem os 3 e-books
          </p>
        ) : (
          <button onClick={() => abrirCheckout(COMBO_EBOOKS.id)} className="btn btn-escuro mt-4 w-full">
            Comprar o combo
          </button>
        )}
      </div>
    </div>
  )
}
