import { useState } from 'react'
import { ChevronRight, Lock, Lightbulb, Brain, CheckCircle2 } from 'lucide-react'
import { CabecalhoPagina } from '../components/AppShell.jsx'
import Bloqueado from '../components/Bloqueado.jsx'
import { AREAS, areaPorId } from '../data/areas.js'
import { RESUMOS, resumoPorId, resumosDaArea } from '../data/resumos.js'
import { resumoLiberado } from '../lib/acesso.js'
import { useStore } from '../lib/store.jsx'
import { navegar } from '../lib/router.js'

export function ListaResumos() {
  const { acessoTotal } = useStore()
  const [filtro, setFiltro] = useState('todas')
  const areas = filtro === 'todas' ? AREAS : AREAS.filter((a) => a.id === filtro)
  return (
    <div>
      <CabecalhoPagina titulo="Resumos rápidos" subtitulo={`${RESUMOS.length} temas que mais caem, com macete`} />
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {[{ id: 'todas', nome: 'Todas', emoji: '✨' }, ...AREAS].map((a) => (
          <button
            key={a.id}
            onClick={() => setFiltro(a.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${filtro === a.id ? 'bg-navy text-white' : 'bg-white ring-1 ring-navy/10'}`}
          >
            {a.emoji} {a.nome}
          </button>
        ))}
      </div>
      <div className="space-y-5">
        {areas.map((a) => (
          <section key={a.id}>
            <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wider" style={{ color: a.cor }}>
              {a.emoji} {a.nome}
            </h2>
            <div className="space-y-2">
              {resumosDaArea(a.id).map((r) => {
                const ok = resumoLiberado(r.id, acessoTotal)
                return (
                  <button
                    key={r.id}
                    onClick={() => navegar(`/app/resumos/${r.id}`)}
                    className={`card flex w-full items-center gap-3 p-3 text-left transition active:scale-[.98] ${ok ? '' : 'opacity-70'}`}
                  >
                    <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: a.cor }} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{r.titulo}</span>
                      <span className="block truncate text-xs text-navy/60">{r.chamada}</span>
                    </span>
                    {ok ? <ChevronRight className="h-5 w-5 shrink-0 text-navy/40" /> : <Lock className="h-4 w-4 shrink-0 text-navy/50" />}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

export function VerResumo({ id }) {
  const { acessoTotal } = useStore()
  const r = resumoPorId(id)
  if (!r) return <CabecalhoPagina titulo="Resumo não encontrado" voltarPara="/app/resumos" />
  const area = areaPorId(r.area)
  if (!resumoLiberado(id, acessoTotal)) {
    return (
      <div>
        <CabecalhoPagina titulo={r.titulo} subtitulo={area.nome} voltarPara="/app/resumos" />
        <Bloqueado titulo="Resumo bloqueado" texto="No plano grátis você tem 1 resumo por área. Libere todos os 20 resumos com macetes." />
      </div>
    )
  }
  const lista = resumosDaArea(r.area)
  const prox = lista[lista.findIndex((x) => x.id === id) + 1]
  return (
    <div className="space-y-4">
      <CabecalhoPagina titulo={r.titulo} subtitulo={`${area.emoji} ${area.nome} · ${r.chamada}`} voltarPara="/app/resumos" />
      <ul className="card space-y-3">
        {r.topicos.map((t, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: area.cor }} />
            <span>{t}</span>
          </li>
        ))}
      </ul>
      <div className="rounded-3xl bg-energia p-4 text-navy shadow-lg shadow-energia/20">
        <p className="flex items-center gap-2 font-extrabold">
          <Lightbulb className="h-5 w-5" /> Macete
        </p>
        <p className="mt-1 text-[15px] font-medium leading-relaxed">{r.macete}</p>
      </div>
      <div className="grid gap-2">
        <button onClick={() => navegar(`/app/quizzes/${r.area}`)} className="btn btn-escuro w-full">
          <Brain className="h-5 w-5" /> Treinar com o quiz de {area.nome}
        </button>
        {prox && (
          <button onClick={() => navegar(`/app/resumos/${prox.id}`)} className="btn btn-claro w-full">
            Próximo: {prox.titulo} {!resumoLiberado(prox.id, acessoTotal) && '🔒'} <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}
