import { CabecalhoPagina } from '../components/AppShell.jsx'
import { CardsPlanos, FaixaOferta } from '../components/Ofertas.jsx'

export default function Planos() {
  return (
    <div className="space-y-6">
      <CabecalhoPagina titulo="Desbloqueie tudo" subtitulo="Pagamento único · acesso até o ENEM 2026" />
      <FaixaOferta />
      <div className="pt-2">
        <CardsPlanos noApp />
      </div>
      <p className="text-center text-xs text-navy/50">Sem mensalidade. Sem renovação automática.</p>
    </div>
  )
}
