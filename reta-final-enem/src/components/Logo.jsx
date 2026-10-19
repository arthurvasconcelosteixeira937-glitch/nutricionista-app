import { useRef } from 'react'
import { useStore } from '../lib/store.jsx'
import { useToast } from './Toast.jsx'

export function LogoIcone({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#0B1E3F" />
      <rect x="1" y="1" width="62" height="62" rx="15" fill="none" stroke="#FFC93C" strokeOpacity=".35" strokeWidth="2" />
      <path d="M32 11 56 21.5 32 32 8 21.5Z" fill="#FFC93C" />
      <path d="M17 25.5v9c0 4.4 6.7 7.5 15 7.5s15-3.1 15-7.5v-9L32 32Z" fill="#fff" />
      <path d="M53 22.5v12" stroke="#FFC93C" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="53" cy="36.5" r="2.8" fill="#FFC93C" />
      <path d="M35.5 34 25 49h7.2L28.5 60 41.5 43.5h-7.3L38.5 34Z" fill="#FFC93C" stroke="#0B1E3F" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

// Logo com o "Modo teste" escondido: tocar 5 vezes seguidas (em até 3 s) libera/bloqueia tudo.
export default function Logo({ claro = true, compacto = false }) {
  const { modoTeste, alternarModoTeste } = useStore()
  const toast = useToast()
  const toques = useRef([])

  const aoTocar = () => {
    const agora = Date.now()
    toques.current = [...toques.current.filter((t) => agora - t < 3000), agora]
    if (toques.current.length >= 5) {
      toques.current = []
      alternarModoTeste()
      toast(modoTeste ? '🔒 Modo teste DESLIGADO' : '🧪 Modo teste LIGADO: tudo liberado!')
    }
  }

  return (
    <button type="button" onClick={aoTocar} className="flex select-none items-center gap-2" aria-label="Reta Final ENEM">
      <LogoIcone className={compacto ? 'h-8 w-8' : 'h-10 w-10'} />
      <span className={`text-left font-extrabold leading-none tracking-tight ${claro ? 'text-white' : 'text-navy'}`}>
        <span className={compacto ? 'text-sm' : 'text-base'}>Reta Final</span>
        <span className={`block font-black text-energia ${compacto ? 'text-xs' : 'text-sm'}`}>
          ENEM {modoTeste && <span className="ml-1 rounded bg-energia px-1 text-[9px] text-navy">TESTE</span>}
        </span>
      </span>
    </button>
  )
}
