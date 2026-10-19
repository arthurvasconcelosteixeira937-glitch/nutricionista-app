import { useEffect, useState } from 'react'

// Roteador simples por hash (#/app/quizzes). Funciona em qualquer hospedagem, inclusive arquivo único.
const lerRota = () => window.location.hash.replace(/^#/, '') || '/'

export function useRota() {
  const [rota, setRota] = useState(lerRota)
  useEffect(() => {
    const aoMudar = () => {
      setRota(lerRota())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', aoMudar)
    return () => window.removeEventListener('hashchange', aoMudar)
  }, [])
  return rota
}

export function navegar(caminho) {
  if (lerRota() === caminho) return
  window.location.hash = caminho
}
