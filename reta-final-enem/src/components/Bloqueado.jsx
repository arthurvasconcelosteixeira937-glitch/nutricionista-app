import { Lock } from 'lucide-react'
import { navegar } from '../lib/router.js'

// Cartão de conteúdo bloqueado (plano grátis) com botão "Desbloquear".
export default function Bloqueado({ titulo = 'Conteúdo exclusivo', texto = 'Libere tudo com a Revisão Completa.', compacto = false }) {
  if (compacto) {
    return (
      <button
        onClick={() => navegar('/app/planos')}
        className="inline-flex items-center gap-1 rounded-full bg-energia px-3 py-1.5 text-xs font-bold text-navy shadow-sm active:scale-95"
      >
        <Lock className="h-3.5 w-3.5" /> Desbloquear
      </button>
    )
  }
  return (
    <div className="flex flex-col items-center rounded-3xl bg-navy p-6 text-center text-white">
      <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-energia text-2xl">🔒</span>
      <h3 className="text-lg font-extrabold">{titulo}</h3>
      <p className="mt-1 text-sm text-white/75">{texto}</p>
      <button onClick={() => navegar('/app/planos')} className="btn btn-primario mt-4">
        <Lock className="h-4 w-4" /> Desbloquear
      </button>
    </div>
  )
}
