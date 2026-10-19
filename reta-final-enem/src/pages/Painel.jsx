import { Brain, BookOpenText, Layers, PenLine, Timer, Backpack, ChevronRight, Lock, Sparkles, Trophy } from 'lucide-react'
import Contagem, { useAgora } from '../components/Contagem.jsx'
import Compartilhar from '../components/Compartilhar.jsx'
import Bloqueado from '../components/Bloqueado.jsx'
import { ListaTarefas } from '../components/Missao.jsx'
import { useStore } from '../lib/store.jsx'
import { navegar } from '../lib/router.js'
import { primeiroNome } from '../lib/util.js'
import { alvoDaContagem } from '../lib/datas.js'
import { PLANO_21 } from '../data/plano21.js'
import { AREAS } from '../data/areas.js'
import { LIMITES_GRATIS } from '../data/planos.js'

const ATALHOS = [
  { rota: '/app/quizzes', rotulo: 'Quizzes', icone: Brain, cor: 'bg-violet-100 text-violet-700' },
  { rota: '/app/resumos', rotulo: 'Resumos', icone: BookOpenText, cor: 'bg-orange-100 text-orange-700' },
  { rota: '/app/flashcards', rotulo: 'Flashcards', icone: Layers, cor: 'bg-amber-100 text-amber-700' },
  { rota: '/app/redacao', rotulo: 'Redação', icone: PenLine, cor: 'bg-rose-100 text-rose-700' },
  { rota: '/app/simulado', rotulo: 'Simulado', icone: Timer, cor: 'bg-sky-100 text-sky-700', premium: true },
  { rota: '/app/prova', rotulo: 'Dia da Prova', icone: Backpack, cor: 'bg-emerald-100 text-emerald-700' },
]

function GraficoDesempenho() {
  const { quiz } = useStore()
  const algum = AREAS.some((a) => quiz[a.id]?.respondidas)
  return (
    <section className="card">
      <h2 className="flex items-center gap-2 font-extrabold">
        <Trophy className="h-5 w-5 text-energia-600" /> Seu desempenho por área
      </h2>
      {!algum && <p className="mt-1 text-sm text-navy/60">Faça seu primeiro quiz para ver o gráfico aqui. 📊</p>}
      <div className="mt-4 flex h-40 items-end justify-around gap-3">
        {AREAS.map((a) => {
          const d = quiz[a.id]
          const pct = d?.respondidas ? Math.round((d.acertos / d.respondidas) * 100) : 0
          return (
            <button key={a.id} onClick={() => navegar(`/app/quizzes/${a.id}`)} className="flex h-full flex-1 flex-col items-center justify-end">
              <span className="mb-1 text-xs font-extrabold">{d?.respondidas ? `${pct}%` : '–'}</span>
              <span className="flex w-full max-w-12 flex-1 items-end overflow-hidden rounded-xl bg-navy-50">
                <span className="w-full rounded-xl transition-all duration-700" style={{ height: `${Math.max(pct, d?.respondidas ? 4 : 0)}%`, background: a.cor }} />
              </span>
              <span className="mt-1.5 text-[11px] font-bold text-navy/70">
                {a.emoji} {a.nome}
              </span>
              <span className="text-[10px] text-navy/45">{d?.respondidas || 0} resp.</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default function Painel() {
  const { usuario, acessoTotal, diaAtual, progresso, ofensivaAtiva, xp, tarefas, tarefasFeitas, totalTarefas } = useStore()
  const agora = useAgora(60000)
  const info = alvoDaContagem(agora)
  const dia = PLANO_21.find((d) => d.dia === diaAtual)
  const bloqueado = !acessoTotal && diaAtual > LIMITES_GRATIS.diasPlano
  const tudoFeito = tarefasFeitas >= totalTarefas
  const feitasHoje = dia.tarefas.filter((_, i) => tarefas[`${dia.dia}-${i}`]).length

  return (
    <div className="space-y-4">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-extrabold">Fala, {primeiroNome(usuario?.nome)}! Bora revisar? 💪</h1>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-navy p-4 text-white">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-energia/20 blur-2xl" />
        <p className="relative mb-2 text-xs font-semibold uppercase tracking-wider text-white/70">{info ? `Faltam para o ${info.rotulo} · ${info.data}, 13h30` : 'ENEM 2026'}</p>
        <div className="relative">
          <Contagem segundos={false} />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <div className="card col-span-3 p-3">
          <div className="flex items-center justify-between text-sm font-bold">
            <span>Progresso geral</span>
            <span>{progresso}%</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-navy-50">
            <div className="h-full rounded-full bg-gradient-to-r from-energia to-amber-400 transition-all duration-700" style={{ width: `${progresso}%` }} />
          </div>
          <p className="mt-1 text-xs text-navy/55">
            {tarefasFeitas} de {totalTarefas} tarefas do plano de 21 dias
          </p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl">🔥</p>
          <p className="text-lg font-extrabold">{ofensivaAtiva}</p>
          <p className="text-[11px] font-semibold text-navy/55">{ofensivaAtiva === 1 ? 'dia seguido' : 'dias seguidos'}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl">⚡</p>
          <p className="text-lg font-extrabold">{xp}</p>
          <p className="text-[11px] font-semibold text-navy/55">pontos XP</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl">📅</p>
          <p className="text-lg font-extrabold">{diaAtual}/21</p>
          <p className="text-[11px] font-semibold text-navy/55">dia do plano</p>
        </div>
      </section>

      <section className="card ring-2 ring-energia">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-energia-600">🎯 Missão de hoje · Dia {dia.dia}</p>
            <h2 className="text-lg font-extrabold leading-tight">{tudoFeito ? 'Plano concluído! 🏆' : dia.titulo}</h2>
          </div>
          {!bloqueado && !tudoFeito && (
            <span className="shrink-0 rounded-full bg-navy-50 px-2.5 py-1 text-xs font-bold">
              {feitasHoje}/{dia.tarefas.length}
            </span>
          )}
        </div>
        {tudoFeito ? (
          <p className="text-sm text-navy/70">Você completou os 21 dias. Agora é revisar os erros, refazer o simulado e descansar. Você tá pronto! 🎓</p>
        ) : bloqueado ? (
          <Bloqueado titulo={`Dia ${dia.dia} bloqueado`} texto="O plano grátis vai até o dia 3. Libere os 21 dias e continue sua sequência!" />
        ) : (
          <ListaTarefas dia={dia} />
        )}
        <button onClick={() => navegar('/app/plano')} className="mt-3 flex w-full items-center justify-center gap-1 py-1 text-sm font-bold text-navy/70">
          Ver os 21 dias <ChevronRight className="h-4 w-4" />
        </button>
      </section>

      <section>
        <h2 className="mb-2 font-extrabold">Atalhos</h2>
        <div className="grid grid-cols-3 gap-2">
          {ATALHOS.map((a) => (
            <button key={a.rota} onClick={() => navegar(a.rota)} className="card relative flex flex-col items-center gap-2 p-3 transition active:scale-95">
              <span className={`grid h-12 w-12 place-items-center rounded-2xl ${a.cor}`}>
                <a.icone className="h-6 w-6" />
              </span>
              <span className="text-xs font-bold">{a.rotulo}</span>
              {a.premium && !acessoTotal && <Lock className="absolute right-2 top-2 h-3.5 w-3.5 text-navy/40" />}
            </button>
          ))}
        </div>
      </section>

      <GraficoDesempenho />

      {!acessoTotal && (
        <button
          onClick={() => navegar('/app/planos')}
          className="flex w-full items-center gap-3 rounded-3xl bg-gradient-to-r from-energia to-amber-300 p-4 text-left text-navy shadow-lg shadow-energia/20 active:scale-[.98]"
        >
          <Sparkles className="h-8 w-8 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block font-extrabold">Libere tudo por R$ 19,90</span>
            <span className="text-sm">80 questões, 21 dias, simulado e redação completa.</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0" />
        </button>
      )}

      <Compartilhar className="btn-claro w-full" />
    </div>
  )
}
