import { useState } from 'react'
import { ChevronDown, Check, Lock } from 'lucide-react'
import { CabecalhoPagina } from '../components/AppShell.jsx'
import { ListaTarefas } from '../components/Missao.jsx'
import Bloqueado from '../components/Bloqueado.jsx'
import { useStore } from '../lib/store.jsx'
import { PLANO_21 } from '../data/plano21.js'
import { LIMITES_GRATIS } from '../data/planos.js'

export default function PlanoCompleto() {
  const { tarefas, acessoTotal, diaAtual } = useStore()
  const [aberto, setAberto] = useState(diaAtual)

  return (
    <div>
      <CabecalhoPagina titulo="Plano de 21 dias" subtitulo="Um dia por vez. Marque cada tarefa ao terminar." />
      <ol className="space-y-2">
        {PLANO_21.map((d) => {
          const feitas = d.tarefas.filter((_, i) => tarefas[`${d.dia}-${i}`]).length
          const completo = feitas === d.tarefas.length
          const travado = !acessoTotal && d.dia > LIMITES_GRATIS.diasPlano
          const estaAberto = aberto === d.dia
          return (
            <li key={d.dia} className={`card p-0 ${d.dia === diaAtual ? 'ring-2 ring-energia' : ''}`}>
              <button onClick={() => setAberto(estaAberto ? null : d.dia)} className="flex w-full items-center gap-3 p-3 text-left">
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-extrabold ${completo ? 'bg-emerald-500 text-white' : travado ? 'bg-navy-50 text-navy/40' : 'bg-navy text-energia'}`}
                >
                  {completo ? <Check className="h-5 w-5" strokeWidth={3} /> : travado ? <Lock className="h-4 w-4" /> : d.dia}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-navy/50">
                    Dia {d.dia} {d.dia === diaAtual && '· HOJE'}
                  </span>
                  <span className="block truncate font-bold">{d.titulo}</span>
                </span>
                <span className="text-xs font-bold text-navy/50">
                  {feitas}/{d.tarefas.length}
                </span>
                <ChevronDown className={`h-5 w-5 shrink-0 transition ${estaAberto ? 'rotate-180' : ''}`} />
              </button>
              {estaAberto && <div className="animate-fade-up px-3 pb-3">{travado ? <Bloqueado compacto /> : <ListaTarefas dia={d} />}</div>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
