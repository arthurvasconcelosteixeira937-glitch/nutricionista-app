import { useState } from 'react'
import { LogOut, Phone, Mail, Crown, ChevronRight, CalendarCheck, Backpack, ShoppingBag, FlaskConical } from 'lucide-react'
import { CabecalhoPagina } from '../components/AppShell.jsx'
import Compartilhar from '../components/Compartilhar.jsx'
import { IconeWhatsApp } from '../components/WhatsAppFlutuante.jsx'
import { useStore } from '../lib/store.jsx'
import { navegar } from '../lib/router.js'
import { PLANOS } from '../data/planos.js'
import { WHATSAPP_SUPORTE } from '../data/config.js'

export default function Perfil() {
  const { usuario, plano, modoTeste, xp, ofensivaAtiva, progresso, quiz, simulados, sair, alternarModoTeste } = useStore()
  const nomePlano = modoTeste ? 'Modo teste (tudo liberado)' : PLANOS.find((p) => p.id === plano)?.nome
  const respondidas = Object.values(quiz).reduce((n, q) => n + q.respondidas, 0)

  const [confirmando, setConfirmando] = useState(false)

  const confirmarSaida = () => {
    if (!confirmando) return setConfirmando(true)
    sair()
    navegar('/')
  }

  return (
    <div className="space-y-4">
      <CabecalhoPagina titulo="Perfil" />
      <div className="card flex items-center gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-navy text-2xl font-extrabold text-energia">{usuario?.nome?.[0]?.toUpperCase()}</span>
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold">{usuario?.nome}</p>
          <p className="flex items-center gap-1.5 text-sm text-navy/60">
            <Phone className="h-3.5 w-3.5" /> {usuario?.whatsapp}
          </p>
          {usuario?.email && (
            <p className="flex items-center gap-1.5 truncate text-sm text-navy/60">
              <Mail className="h-3.5 w-3.5 shrink-0" /> {usuario.email}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          ['⚡', xp, 'XP'],
          ['🔥', ofensivaAtiva, 'seguidos'],
          ['✅', respondidas, 'questões'],
          ['⏱️', simulados.length, 'simulados'],
        ].map(([e, v, r]) => (
          <div key={r} className="card p-2">
            <p>{e}</p>
            <p className="font-extrabold">{v}</p>
            <p className="text-[10px] text-navy/55">{r}</p>
          </div>
        ))}
      </div>

      <button onClick={() => navegar('/app/planos')} className="card flex w-full items-center gap-3 text-left">
        <Crown className="h-6 w-6 shrink-0 text-energia-600" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-navy/50">Seu plano</span>
          <span className="block font-extrabold">{nomePlano}</span>
        </span>
        <ChevronRight className="h-5 w-5 text-navy/40" />
      </button>

      <div className="card divide-y divide-navy/5 p-0">
        {[
          [CalendarCheck, `Plano de 21 dias · ${progresso}%`, '/app/plano'],
          [Backpack, 'Checklist do Dia da Prova', '/app/prova'],
          [ShoppingBag, 'Loja de e-books', '/app/loja'],
        ].map(([Icone, texto, rota]) => (
          <button key={rota} onClick={() => navegar(rota)} className="flex w-full items-center gap-3 p-4 text-left font-semibold">
            <Icone className="h-5 w-5 text-navy/60" /> <span className="flex-1">{texto}</span> <ChevronRight className="h-5 w-5 text-navy/40" />
          </button>
        ))}
        <a href={WHATSAPP_SUPORTE} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 font-semibold">
          <IconeWhatsApp className="h-5 w-5 text-[#25D366]" /> <span className="flex-1">Suporte no WhatsApp</span> <ChevronRight className="h-5 w-5 text-navy/40" />
        </a>
      </div>

      <Compartilhar className="btn-escuro w-full" />

      {modoTeste && (
        <button onClick={alternarModoTeste} className="btn w-full bg-violet-100 text-violet-800">
          <FlaskConical className="h-5 w-5" /> Desligar modo teste
        </button>
      )}

      <button onClick={confirmarSaida} className="btn w-full bg-rose-50 text-rose-600 ring-1 ring-rose-200">
        <LogOut className="h-5 w-5" /> {confirmando ? 'Toque de novo para sair' : 'Sair'}
      </button>
      {confirmando && <p className="-mt-2 text-center text-xs font-semibold text-rose-600">Ao sair, o progresso salvo neste aparelho será apagado.</p>}
      <p className="pb-2 text-center text-xs text-navy/40">Reta Final ENEM · Não somos afiliados ao INEP/MEC.</p>
    </div>
  )
}
