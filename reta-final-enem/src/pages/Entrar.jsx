import { useState } from 'react'
import { ArrowLeft, ArrowRight, User, Phone, Mail, ShieldCheck } from 'lucide-react'
import { LogoIcone } from '../components/Logo.jsx'
import { useStore } from '../lib/store.jsx'
import { navegar } from '../lib/router.js'
import { emailValido, mascaraWhatsApp, whatsappValido } from '../lib/util.js'

function Campo({ icone: Icone, rotulo, erro, opcional, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-navy">
        {rotulo} {opcional && <span className="font-medium text-navy/50">(opcional)</span>}
      </span>
      <span className={`flex items-center gap-3 rounded-2xl bg-white px-4 ring-2 transition focus-within:ring-energia ${erro ? 'ring-rose-400' : 'ring-navy/10'}`}>
        <Icone className="h-5 w-5 shrink-0 text-navy/40" />
        <input className="h-14 w-full min-w-0 bg-transparent text-base text-navy outline-none placeholder:text-navy/35" {...props} />
      </span>
      {erro && <span className="mt-1 block text-sm font-semibold text-rose-600">{erro}</span>}
    </label>
  )
}

export default function Entrar() {
  const { usuario, entrar } = useStore()
  const [nome, setNome] = useState(usuario?.nome || '')
  const [whats, setWhats] = useState(usuario?.whatsapp || '')
  const [email, setEmail] = useState(usuario?.email || '')
  const [erros, setErros] = useState({})

  const enviar = (e) => {
    e.preventDefault()
    const novos = {}
    if (nome.trim().length < 2) novos.nome = 'Digite seu nome 😉'
    if (!whatsappValido(whats)) novos.whats = 'WhatsApp inválido. Ex.: (91) 98149-0959'
    if (email && !emailValido(email.trim())) novos.email = 'E-mail inválido'
    setErros(novos)
    if (Object.keys(novos).length) return
    entrar({ nome: nome.trim(), whatsapp: whats, email: email.trim() })
    navegar('/app')
  }

  return (
    <div className="flex min-h-screen flex-col bg-navy">
      <div className="relative overflow-hidden px-4 pb-10 pt-4 text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-energia/25 blur-3xl" />
        <button onClick={() => navegar('/')} className="relative -ml-2 flex items-center gap-1 rounded-xl p-2 text-sm font-semibold text-white/80">
          <ArrowLeft className="h-5 w-5" /> Voltar
        </button>
        <div className="relative mx-auto mt-4 max-w-md text-center">
          <LogoIcone className="mx-auto h-16 w-16" />
          <h1 className="mt-4 text-3xl font-extrabold">Bora começar? 🚀</h1>
          <p className="mt-2 text-white/75">Sem senha, sem cartão. Só precisamos de 2 informações.</p>
        </div>
      </div>
      <form onSubmit={enviar} noValidate className="flex-1 animate-fade-up rounded-t-[2rem] bg-navy-50 px-4 pb-10 pt-8">
        <div className="mx-auto max-w-md space-y-4">
          <Campo
            icone={User}
            rotulo="Seu nome"
            placeholder="Como você quer ser chamado?"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="given-name"
            erro={erros.nome}
            maxLength={40}
          />
          <Campo
            icone={Phone}
            rotulo="WhatsApp"
            placeholder="(00) 00000-0000"
            inputMode="numeric"
            autoComplete="tel-national"
            value={whats}
            onChange={(e) => setWhats(mascaraWhatsApp(e.target.value))}
            erro={erros.whats}
          />
          <Campo
            icone={Mail}
            rotulo="E-mail"
            opcional
            type="email"
            placeholder="voce@email.com"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            erro={erros.email}
          />
          <button type="submit" className="btn btn-primario w-full py-4 text-lg">
            Entrar e começar <ArrowRight className="h-5 w-5" />
          </button>
          <p className="flex items-start gap-2 text-xs text-navy/60">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            Seus dados ficam salvos só neste aparelho e servem para te mandar dicas da reta final. Nada de spam.
          </p>
        </div>
      </form>
    </div>
  )
}
