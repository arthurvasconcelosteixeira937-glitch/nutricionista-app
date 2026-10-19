import { useState } from 'react'
import { ChevronDown, Lock, Quote, Check } from 'lucide-react'
import { CabecalhoPagina } from '../components/AppShell.jsx'
import Bloqueado from '../components/Bloqueado.jsx'
import { COMPETENCIAS, ESTRUTURA, PROPOSTA_INTERVENCAO, TEMAS, CHECKLIST_REDACAO } from '../data/redacao.js'
import { LIMITES_GRATIS } from '../data/planos.js'
import { useStore } from '../lib/store.jsx'

const ABAS = ['Competências', 'Estrutura', 'Temas', 'Checklist']

function Competencias() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-navy/70">A redação vale até 1.000 pontos: cada competência vale até 200. Entenda o que o corretor procura:</p>
      {COMPETENCIAS.map((c) => (
        <div key={c.n} className="card flex gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-navy text-lg font-extrabold text-energia">{c.n}</span>
          <div className="min-w-0">
            <h3 className="font-extrabold">{c.titulo}</h3>
            <p className="mt-0.5 text-sm text-navy/75">{c.resumo}</p>
            <p className="mt-2 rounded-xl bg-energia-50 p-2 text-xs font-semibold text-navy/80">💡 {c.dica}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function Estrutura() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-navy/70">4 parágrafos, de 25 a 30 linhas no total. Use os modelos como esqueleto e preencha com suas ideias:</p>
      {ESTRUTURA.map((e, i) => (
        <div key={e.parte} className="card">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold">
              {i + 1}. {e.parte}
            </h3>
            <span className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-bold text-navy/60">{e.linhas}</span>
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {e.passos.map((p) => (
              <li key={p} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={3} /> {p}
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-2xl border-l-4 border-energia bg-navy-50 p-3 text-sm italic leading-relaxed text-navy/80">{e.modelo}</p>
        </div>
      ))}
      <div className="rounded-3xl bg-navy p-4 text-white">
        <h3 className="font-extrabold text-energia">Proposta de intervenção completa (Competência 5)</h3>
        <div className="mt-3 space-y-2">
          {PROPOSTA_INTERVENCAO.map((p) => (
            <div key={p.item} className="rounded-2xl bg-white/10 p-3">
              <p className="text-sm font-extrabold">
                {p.item} <span className="font-medium text-white/60">— {p.pergunta}</span>
              </p>
              <p className="mt-0.5 text-xs text-white/80">{p.exemplo}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Temas() {
  const { acessoTotal } = useStore()
  const [aberto, setAberto] = useState(0)
  return (
    <div className="space-y-2">
      <p className="text-sm text-navy/70">8 temas possíveis para treinar, com repertórios que você pode usar:</p>
      {TEMAS.map((t, i) => {
        const travado = !acessoTotal && i >= LIMITES_GRATIS.temasRedacao
        const estaAberto = aberto === i
        return (
          <div key={t.titulo} className="card p-0">
            <button onClick={() => setAberto(estaAberto ? null : i)} className="flex w-full items-center gap-3 p-3 text-left">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-extrabold ${travado ? 'bg-navy-50 text-navy/40' : 'bg-rose-100 text-rose-700'}`}>
                {travado ? <Lock className="h-4 w-4" /> : i + 1}
              </span>
              <span className={`min-w-0 flex-1 text-sm font-bold ${travado ? 'text-navy/50' : ''}`}>{t.titulo}</span>
              <ChevronDown className={`h-5 w-5 shrink-0 transition ${estaAberto ? 'rotate-180' : ''}`} />
            </button>
            {estaAberto && (
              <div className="animate-fade-up px-3 pb-3">
                {travado ? (
                  <Bloqueado compacto />
                ) : (
                  <>
                    <p className="text-sm text-navy/70">{t.contexto}</p>
                    <p className="mt-3 text-xs font-extrabold uppercase tracking-wider text-navy/50">Repertórios</p>
                    <ul className="mt-1 space-y-1.5">
                      {t.repertorios.map((r) => (
                        <li key={r} className="flex gap-2 rounded-xl bg-navy-50 p-2 text-sm">
                          <Quote className="mt-0.5 h-4 w-4 shrink-0 text-energia-600" /> {r}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Checklist() {
  const { checkRedacao, alternarCheck } = useStore()
  const feitos = CHECKLIST_REDACAO.filter((_, i) => checkRedacao[i]).length
  return (
    <div>
      <div className="card mb-3 flex items-center justify-between">
        <span className="text-sm font-bold">Confira sua redação</span>
        <span className="rounded-full bg-navy px-3 py-1 text-sm font-extrabold text-energia">
          {feitos}/{CHECKLIST_REDACAO.length}
        </span>
      </div>
      <ul className="space-y-2">
        {CHECKLIST_REDACAO.map((item, i) => {
          const ok = !!checkRedacao[i]
          return (
            <li key={item}>
              <button
                onClick={() => alternarCheck('checkRedacao', i)}
                role="checkbox"
                aria-checked={ok}
                className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left text-sm font-semibold transition ${ok ? 'bg-emerald-50 text-navy/60' : 'bg-white ring-1 ring-navy/10'}`}
              >
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${ok ? 'bg-emerald-500 text-white' : 'ring-2 ring-navy/20'}`}>
                  {ok && <Check className="h-4 w-4" strokeWidth={3.5} />}
                </span>
                {item}
              </button>
            </li>
          )
        })}
      </ul>
      {feitos === CHECKLIST_REDACAO.length && (
        <p className="mt-4 animate-pop rounded-2xl bg-emerald-500 p-4 text-center font-bold text-white">Redação conferida! Tá com cara de nota alta 🏆</p>
      )}
      <button onClick={() => CHECKLIST_REDACAO.forEach((_, i) => checkRedacao[i] && alternarCheck('checkRedacao', i))} className="mt-3 w-full py-2 text-sm font-bold text-navy/50">
        Limpar checklist (para a próxima redação)
      </button>
    </div>
  )
}

export default function Redacao() {
  const [aba, setAba] = useState(0)
  return (
    <div>
      <CabecalhoPagina titulo="Redação" subtitulo="Tudo para mirar nos 1.000 pontos" />
      <div className="sticky top-[3.6rem] z-20 -mx-4 mb-4 bg-navy-50/95 px-4 py-2 backdrop-blur">
        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-white p-1 ring-1 ring-navy/10">
          {ABAS.map((a, i) => (
            <button
              key={a}
              onClick={() => setAba(i)}
              className={`rounded-xl px-1 py-2 text-[11px] font-bold transition sm:text-sm ${aba === i ? 'bg-navy text-white' : 'text-navy/60'}`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      {aba === 0 && <Competencias />}
      {aba === 1 && <Estrutura />}
      {aba === 2 && <Temas />}
      {aba === 3 && <Checklist />}
    </div>
  )
}
