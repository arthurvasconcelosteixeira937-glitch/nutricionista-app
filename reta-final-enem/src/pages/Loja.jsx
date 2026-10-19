import { CabecalhoPagina } from '../components/AppShell.jsx'
import { FaixaOferta, VitrineEbooks } from '../components/Ofertas.jsx'
import { useStore } from '../lib/store.jsx'
import { navegar } from '../lib/router.js'
import { Sparkles, ChevronRight } from 'lucide-react'

export default function Loja() {
  const { acessoTotal } = useStore()
  return (
    <div className="space-y-4">
      <CabecalhoPagina titulo="Loja" subtitulo="E-books para turbinar a reta final" />
      <FaixaOferta />
      {!acessoTotal && (
        <button onClick={() => navegar('/app/planos')} className="flex w-full items-center gap-3 rounded-3xl bg-navy p-4 text-left text-white active:scale-[.98]">
          <Sparkles className="h-7 w-7 shrink-0 text-energia" />
          <span className="min-w-0 flex-1">
            <span className="block font-extrabold">Ver planos do app</span>
            <span className="text-sm text-white/70">Combo Aprovação já vem com os 3 e-books</span>
          </span>
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
      <VitrineEbooks />
    </div>
  )
}
