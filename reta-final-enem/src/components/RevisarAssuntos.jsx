import { BookOpenText, ChevronRight, Lock } from 'lucide-react'
import { resumoPorId } from '../data/resumos.js'
import { resumoLiberado } from '../lib/acesso.js'
import { navegar } from '../lib/router.js'
import { useStore } from '../lib/store.jsx'

// "Revise estes assuntos": temas das questões erradas, com atalho para o resumo.
export default function RevisarAssuntos({ erradas }) {
  const { acessoTotal } = useStore()
  if (!erradas.length) return null
  const porResumo = {}
  for (const q of erradas) {
    porResumo[q.resumo] = porResumo[q.resumo] || []
    if (!porResumo[q.resumo].includes(q.tema)) porResumo[q.resumo].push(q.tema)
  }
  return (
    <div className="card">
      <h3 className="font-extrabold">📌 Revise estes assuntos</h3>
      <ul className="mt-3 space-y-2">
        {Object.entries(porResumo).map(([idResumo, temas]) => {
          const r = resumoPorId(idResumo)
          const liberado = resumoLiberado(idResumo, acessoTotal)
          return (
            <li key={idResumo}>
              <button
                onClick={() => navegar(liberado ? `/app/resumos/${idResumo}` : '/app/planos')}
                className="flex w-full items-center gap-3 rounded-2xl bg-navy-50 p-3 text-left active:scale-[.98]"
              >
                <BookOpenText className="h-5 w-5 shrink-0 text-energia-600" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{temas.join(' • ')}</span>
                  <span className="text-xs text-navy/60">Resumo: {r?.titulo}</span>
                </span>
                {liberado ? <ChevronRight className="h-5 w-5 shrink-0" /> : <Lock className="h-4 w-4 shrink-0 text-navy/50" />}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
