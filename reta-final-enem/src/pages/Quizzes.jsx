import { useState } from 'react'
import { ChevronRight, Play, RotateCcw, Shuffle, Lock, ArrowRight } from 'lucide-react'
import { CabecalhoPagina } from '../components/AppShell.jsx'
import Questao from '../components/Questao.jsx'
import Bloqueado from '../components/Bloqueado.jsx'
import RevisarAssuntos from '../components/RevisarAssuntos.jsx'
import { AREAS, areaPorId } from '../data/areas.js'
import { QUESTOES } from '../data/questoes/index.js'
import { questoesLiberadas } from '../lib/acesso.js'
import { useStore } from '../lib/store.jsx'
import { navegar } from '../lib/router.js'
import { embaralhar } from '../lib/util.js'

export function ListaQuizzes() {
  const { quiz, acessoTotal } = useStore()
  return (
    <div>
      <CabecalhoPagina titulo="Quizzes" subtitulo="Questões no estilo ENEM com explicação" />
      <div className="space-y-3">
        {AREAS.map((a) => {
          const d = quiz[a.id]
          const total = QUESTOES[a.id].length
          const liberadas = questoesLiberadas(a.id, acessoTotal).length
          const pct = d?.respondidas ? Math.round((d.acertos / d.respondidas) * 100) : null
          return (
            <button key={a.id} onClick={() => navegar(`/app/quizzes/${a.id}`)} className="card flex w-full items-center gap-4 text-left transition active:scale-[.98]">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: a.corClara }}>
                {a.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold">{a.nome}</span>
                <span className="block text-xs text-navy/60">
                  {liberadas} de {total} questões liberadas {liberadas < total && '🔒'}
                </span>
                <span className="mt-2 block h-2 overflow-hidden rounded-full bg-navy-50">
                  <span className="block h-full rounded-full" style={{ width: `${pct ?? 0}%`, background: a.cor }} />
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-lg font-extrabold">{pct === null ? '–' : `${pct}%`}</span>
                <span className="text-[10px] text-navy/50">acertos</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-navy/40" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function QuizArea({ idArea }) {
  const area = areaPorId(idArea)
  const { quiz, acessoTotal, responderQuestao, finalizarRodada } = useStore()
  const [fase, setFase] = useState('inicio') // inicio | jogando | fim
  const [lista, setLista] = useState([])
  const [indice, setIndice] = useState(0)
  const [respostas, setRespostas] = useState({})

  if (!area) return <CabecalhoPagina titulo="Área não encontrada" voltarPara="/app/quizzes" />

  const liberadas = questoesLiberadas(idArea, acessoTotal)
  const total = QUESTOES[idArea].length
  const stats = quiz[idArea]
  const idsErradas = Object.keys(stats?.erradas || {})
  const erradasLiberadas = liberadas.filter((q) => idsErradas.includes(q.id))

  const iniciar = (questoes) => {
    setLista(questoes)
    setIndice(0)
    setRespostas({})
    setFase('jogando')
    window.scrollTo(0, 0)
  }

  if (fase === 'inicio') {
    return (
      <div>
        <CabecalhoPagina titulo={`${area.emoji} ${area.nome}`} subtitulo={area.nomeCompleto} voltarPara="/app/quizzes" />
        <div className="card mb-4 grid grid-cols-3 text-center">
          <div>
            <p className="text-xl font-extrabold">{stats?.respondidas || 0}</p>
            <p className="text-[11px] text-navy/55">respondidas</p>
          </div>
          <div>
            <p className="text-xl font-extrabold">{stats?.respondidas ? Math.round((stats.acertos / stats.respondidas) * 100) : 0}%</p>
            <p className="text-[11px] text-navy/55">de acertos</p>
          </div>
          <div>
            <p className="text-xl font-extrabold">{stats?.melhor || 0}%</p>
            <p className="text-[11px] text-navy/55">melhor rodada</p>
          </div>
        </div>
        <div className="space-y-3">
          {acessoTotal ? (
            <>
              <button onClick={() => iniciar(embaralhar(liberadas).slice(0, 10))} className="btn btn-primario w-full">
                <Shuffle className="h-5 w-5" /> Rodada rápida (10 questões)
              </button>
              <button onClick={() => iniciar(embaralhar(liberadas))} className="btn btn-escuro w-full">
                <Play className="h-5 w-5" /> Todas as {liberadas.length} questões
              </button>
            </>
          ) : (
            <button onClick={() => iniciar(liberadas)} className="btn btn-primario w-full">
              <Play className="h-5 w-5" /> Começar ({liberadas.length} questões grátis)
            </button>
          )}
          {erradasLiberadas.length > 0 && (
            <button onClick={() => iniciar(erradasLiberadas)} className="btn btn-claro w-full">
              <RotateCcw className="h-5 w-5" /> Refazer as que errei ({erradasLiberadas.length})
            </button>
          )}
        </div>
        {!acessoTotal && (
          <div className="mt-6">
            <div className="mb-3 space-y-2">
              {QUESTOES[idArea].slice(liberadas.length, liberadas.length + 3).map((q) => (
                <div key={q.id} className="flex items-center gap-3 rounded-2xl bg-white/60 p-3 text-sm text-navy/50 ring-1 ring-navy/5">
                  <Lock className="h-4 w-4 shrink-0" /> <span className="truncate">{q.tema}</span>
                </div>
              ))}
            </div>
            <Bloqueado titulo={`+${total - liberadas.length} questões de ${area.nome}`} texto="Libere todas as questões com explicação e treine até ficar fera." />
          </div>
        )}
      </div>
    )
  }

  if (fase === 'jogando') {
    const q = lista[indice]
    const resp = respostas[q.id]
    const responder = (i) => {
      if (resp !== undefined) return
      setRespostas((r) => ({ ...r, [q.id]: i }))
      responderQuestao(idArea, q.id, i === q.correta)
    }
    const proxima = () => {
      if (indice + 1 < lista.length) {
        setIndice(indice + 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        const acertos = lista.filter((x) => respostas[x.id] === x.correta).length
        finalizarRodada(idArea, acertos, lista.length)
        setFase('fim')
        window.scrollTo(0, 0)
      }
    }
    return (
      <div className="pb-4">
        <div className="mb-4 flex items-center gap-3">
          <button onClick={() => setFase('inicio')} className="text-sm font-bold text-navy/60">
            Sair
          </button>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white ring-1 ring-navy/10">
            <div className="h-full rounded-full transition-all" style={{ width: `${((indice + (resp !== undefined ? 1 : 0)) / lista.length) * 100}%`, background: area.cor }} />
          </div>
          <span className="text-sm font-extrabold">
            {indice + 1}/{lista.length}
          </span>
        </div>
        <Questao key={q.id} questao={q} resposta={resp} aoResponder={responder} mostrarGabarito rotulo={`${area.nome} · ${q.tema}`} />
        {resp !== undefined && (
          <button onClick={proxima} className="btn btn-primario mt-4 w-full animate-fade-up">
            {indice + 1 < lista.length ? 'Próxima questão' : 'Ver meu resultado'} <ArrowRight className="h-5 w-5" />
          </button>
        )}
      </div>
    )
  }

  // fim
  const acertos = lista.filter((x) => respostas[x.id] === x.correta).length
  const pct = Math.round((acertos / lista.length) * 100)
  const nota = ((acertos / lista.length) * 10).toFixed(1).replace('.', ',')
  const erradas = lista.filter((x) => respostas[x.id] !== x.correta)
  const msg =
    pct >= 80
      ? 'Monstro! 🏆 Tá voando!'
      : pct >= 60
        ? 'Muito bom! 💪 Bora pra cima!'
        : pct >= 40
          ? 'Tá no caminho! 📈 Revise e tente de novo.'
          : 'Calma, faz parte! 💛 Leia os resumos e volte mais forte.'
  return (
    <div className="space-y-4">
      <div className="animate-pop rounded-3xl bg-navy p-6 text-center text-white">
        <p className="text-sm font-semibold text-white/70">Resultado · {area.nome}</p>
        <p className="mt-2 text-6xl font-extrabold text-energia">{nota}</p>
        <p className="text-sm text-white/70">nota de 0 a 10</p>
        <div className="mt-4 flex justify-center gap-6">
          <div>
            <p className="text-2xl font-extrabold">{pct}%</p>
            <p className="text-xs text-white/60">de acertos</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold">
              {acertos}/{lista.length}
            </p>
            <p className="text-xs text-white/60">questões</p>
          </div>
        </div>
        <p className="mt-4 font-bold">{msg}</p>
      </div>
      <RevisarAssuntos erradas={erradas} />
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setFase('inicio')} className="btn btn-primario">
          <RotateCcw className="h-5 w-5" /> De novo
        </button>
        <button onClick={() => navegar('/app')} className="btn btn-claro">
          Ir ao painel
        </button>
      </div>
      {!acessoTotal && <Bloqueado titulo="Quer mais questões?" texto={`Ainda tem ${total - liberadas.length} questões de ${area.nome} esperando por você.`} />}
    </div>
  )
}
