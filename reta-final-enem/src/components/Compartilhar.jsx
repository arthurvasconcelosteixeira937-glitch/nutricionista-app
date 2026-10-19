import { Share2 } from 'lucide-react'
import { useToast } from './Toast.jsx'

const TEXTO = 'Tô revisando pro ENEM pelo celular com o Reta Final ENEM: quizzes, resumos e simulado. Bora junto? 🚀'

// Usa o compartilhamento nativo do celular; se não houver, abre o WhatsApp ou copia o link.
export default function Compartilhar({ className = '' }) {
  const toast = useToast()
  const url = window.location.href.split('#')[0]

  const compartilhar = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Reta Final ENEM', text: TEXTO, url })
        return
      } catch (e) {
        if (e?.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(`${TEXTO} ${url}`)
      toast('🔗 Link copiado! Cola no WhatsApp do seu amigo.')
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${TEXTO} ${url}`)}`, '_blank')
    }
  }

  return (
    <button onClick={compartilhar} className={`btn ${className}`}>
      <Share2 className="h-5 w-5" /> Compartilhar com um amigo
    </button>
  )
}
