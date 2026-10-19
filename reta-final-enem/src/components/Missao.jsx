import { Check, ChevronRight } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { navegar } from '../lib/router.js'

export function rotaDaTarefa(t) {
  switch (t.tipo) {
    case 'quiz':
      return `/app/quizzes/${t.area}`
    case 'resumo':
      return `/app/resumos/${t.id}`
    case 'flashcards':
      return '/app/flashcards'
    case 'redacao':
      return '/app/redacao'
    case 'simulado':
      return '/app/simulado'
    case 'prova':
      return '/app/prova'
    default:
      return '/app'
  }
}

// Lista de tarefas de um dia do plano, com checkbox e atalho para a atividade.
export function ListaTarefas({ dia }) {
  const { tarefas, alternarTarefa } = useStore()
  return (
    <ul className="space-y-2">
      {dia.tarefas.map((t, i) => {
        const feita = !!tarefas[`${dia.dia}-${i}`]
        return (
          <li key={i} className={`flex items-center gap-3 rounded-2xl p-2 pr-1 transition ${feita ? 'bg-emerald-50' : 'bg-navy-50'}`}>
            <button
              onClick={() => alternarTarefa(dia.dia, i)}
              role="checkbox"
              aria-checked={feita}
              aria-label={t.texto}
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition active:scale-90 ${feita ? 'bg-emerald-500 text-white' : 'bg-white ring-2 ring-navy/20'}`}
            >
              {feita && <Check className="h-5 w-5 animate-pop" strokeWidth={3.5} />}
            </button>
            <span className={`min-w-0 flex-1 text-sm font-semibold ${feita ? 'text-navy/50 line-through' : ''}`}>{t.texto}</span>
            <button onClick={() => navegar(rotaDaTarefa(t))} className="flex shrink-0 items-center rounded-xl px-2 py-2 text-xs font-bold text-navy/70 active:bg-white">
              Ir <ChevronRight className="h-4 w-4" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
