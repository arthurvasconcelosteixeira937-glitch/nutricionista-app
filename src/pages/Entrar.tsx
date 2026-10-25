import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Aviso from '../components/Aviso'

function traduzirErro(mensagem: string): string {
  const m = mensagem.toLowerCase()
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.'
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail pelo link que enviamos e tente de novo.'
  if (m.includes('already registered')) return 'Este e-mail já tem conta. Toque em "Já tenho conta" para entrar.'
  if (m.includes('password')) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (m.includes('email')) return 'Confira o e-mail digitado.'
  return 'Não conseguimos entrar agora, tente de novo.'
}

export default function Entrar({ modo }: { modo: 'entrar' | 'criar' }) {
  const criando = modo === 'criar'
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setOk(null)
    setEnviando(true)
    try {
      if (criando) {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: senha })
        if (error) throw error
        if (!data.session) {
          setOk('Conta criada! Abra o link que enviamos para o seu e-mail e depois entre aqui.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
        if (error) throw error
      }
    } catch (e) {
      setErro(traduzirErro((e as Error).message ?? ''))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="tela-entrada">
      <div className="marca">
        <img src="/icone.svg" alt="" width={64} height={64} />
        <h1>Aluno em Dia</h1>
        <p>Suas mensalidades cobradas sozinhas.</p>
      </div>

      <form className="cartao" onSubmit={enviar}>
        <h2>{criando ? 'Criar conta' : 'Entrar'}</h2>
        {criando && <p className="passo">Passo 1 de 2 — e-mail e senha</p>}

        <label>
          E-mail
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            autoComplete={criando ? 'new-password' : 'current-password'}
            minLength={6}
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </label>

        <Aviso texto={erro} />
        <Aviso texto={ok} tipo="ok" />

        <button className="botao botao-principal" disabled={enviando}>
          {enviando ? 'Aguarde...' : criando ? 'Continuar' : 'Entrar'}
        </button>

        {criando ? (
          <Link className="botao botao-link" to="/">
            Já tenho conta
          </Link>
        ) : (
          <Link className="botao botao-secundario" to="/criar-conta">
            Criar minha conta — 7 dias grátis
          </Link>
        )}
      </form>
    </div>
  )
}
