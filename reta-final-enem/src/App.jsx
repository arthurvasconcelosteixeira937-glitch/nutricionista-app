import { useEffect } from 'react'
import { StoreProvider, useStore } from './lib/store.jsx'
import { navegar, useRota } from './lib/router.js'
import { ToastProvider } from './components/Toast.jsx'
import { CheckoutProvider } from './components/Checkout.jsx'
import AppShell from './components/AppShell.jsx'
import Landing from './pages/Landing.jsx'
import Entrar from './pages/Entrar.jsx'
import Painel from './pages/Painel.jsx'
import PlanoCompleto from './pages/PlanoCompleto.jsx'
import { ListaQuizzes, QuizArea } from './pages/Quizzes.jsx'
import { ListaResumos, VerResumo } from './pages/Resumos.jsx'
import Flashcards from './pages/Flashcards.jsx'
import Redacao from './pages/Redacao.jsx'
import Simulado from './pages/Simulado.jsx'
import DiaProva from './pages/DiaProva.jsx'
import Loja from './pages/Loja.jsx'
import Planos from './pages/Planos.jsx'
import Perfil from './pages/Perfil.jsx'

function telaDoApp(rota) {
  const [, , secao, id] = rota.split('/') // '/app/quizzes/matematica' → ['', 'app', 'quizzes', 'matematica']
  switch (secao) {
    case undefined:
    case '':
      return <Painel />
    case 'plano':
      return <PlanoCompleto />
    case 'quizzes':
      return id ? <QuizArea key={id} idArea={id} /> : <ListaQuizzes />
    case 'resumos':
      return id ? <VerResumo key={id} id={id} /> : <ListaResumos />
    case 'flashcards':
      return <Flashcards />
    case 'redacao':
      return <Redacao />
    case 'simulado':
      return <Simulado />
    case 'prova':
      return <DiaProva />
    case 'loja':
      return <Loja />
    case 'planos':
      return <Planos />
    case 'perfil':
      return <Perfil />
    default:
      return <Painel />
  }
}

function Rotas() {
  const rota = useRota()
  const { usuario } = useStore()
  const noApp = rota.startsWith('/app')

  // Área do aluno exige a entrada rápida (nome + WhatsApp).
  useEffect(() => {
    if (noApp && !usuario) navegar('/entrar')
  }, [noApp, usuario])

  if (rota === '/entrar') return <Entrar />
  if (noApp) return usuario ? <AppShell rota={rota}>{telaDoApp(rota)}</AppShell> : null
  return <Landing />
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <CheckoutProvider>
          <Rotas />
        </CheckoutProvider>
      </ToastProvider>
    </StoreProvider>
  )
}
