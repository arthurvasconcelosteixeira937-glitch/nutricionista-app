import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import type { Personal } from './lib/tipos'
import Entrar from './pages/Entrar'
import CompletarCadastro from './pages/CompletarCadastro'
import Painel from './pages/Painel'
import Alunos from './pages/Alunos'
import Conta from './pages/Conta'
import Bloqueado from './pages/Bloqueado'
import NavInferior from './components/NavInferior'
import Carregando from './components/Carregando'

export default function App() {
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined)
  const [personal, setPersonal] = useState<Personal | null | undefined>(undefined)
  const [bloqueado, setBloqueado] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessao(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const carregarPersonal = useCallback(async () => {
    if (!sessao) {
      setPersonal(null)
      return
    }
    const [{ data }, { data: estaBloqueado }] = await Promise.all([
      supabase
        .from('personais')
        .select('id, nome, email, whatsapp, asaas_wallet_id, teste_ate')
        .eq('id', sessao.user.id)
        .maybeSingle(),
      supabase.rpc('app_bloqueado'),
    ])
    setPersonal((data as Personal) ?? null)
    setBloqueado(estaBloqueado === true)
  }, [sessao?.user.id])

  useEffect(() => {
    if (sessao === undefined) return
    carregarPersonal()
  }, [sessao, carregarPersonal])

  if (sessao === undefined || (sessao && personal === undefined)) return <Carregando />

  if (!sessao) {
    return (
      <Routes>
        <Route path="/criar-conta" element={<Entrar modo="criar" />} />
        <Route path="*" element={<Entrar modo="entrar" />} />
      </Routes>
    )
  }

  // Cadastro só termina quando a subconta e a assinatura do app foram criadas
  if (!personal?.asaas_wallet_id || !personal.teste_ate) {
    return <CompletarCadastro email={sessao.user.email ?? ''} aoConcluir={carregarPersonal} />
  }

  if (bloqueado) return <Bloqueado aoLiberar={carregarPersonal} />

  return (
    <div className="app">
      <main className="conteudo">
        <Routes>
          <Route path="/" element={<Painel />} />
          <Route path="/alunos" element={<Alunos />} />
          <Route path="/conta" element={<Conta personal={personal} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <NavInferior />
    </div>
  )
}
