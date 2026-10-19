import { useEffect, useState } from 'react'

// Roteador simples por hash (#/app/quizzes). Funciona em qualquer hospedagem, inclusive arquivo único.
// A rota também fica guardada em memória, para funcionar mesmo onde o navegador não deixa mudar o endereço.
let rotaAtual = lerHash()

function lerHash() {
  try {
    return window.location.hash.replace(/^#/, '') || '/'
  } catch {
    return '/'
  }
}

export function useRota() {
  const [rota, setRota] = useState(rotaAtual)
  useEffect(() => {
    const aoMudarHash = () => {
      rotaAtual = lerHash()
      setRota(rotaAtual)
      window.scrollTo(0, 0)
    }
    const aoNavegar = () => {
      setRota(rotaAtual)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', aoMudarHash)
    window.addEventListener('rota', aoNavegar)
    return () => {
      window.removeEventListener('hashchange', aoMudarHash)
      window.removeEventListener('rota', aoNavegar)
    }
  }, [])
  return rota
}

export function navegar(caminho) {
  if (rotaAtual === caminho) return
  rotaAtual = caminho
  try {
    window.location.hash = caminho
  } catch {
    /* endereço bloqueado: segue só em memória */
  }
  window.dispatchEvent(new Event('rota'))
}
