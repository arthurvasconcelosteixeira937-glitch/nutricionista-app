import { useEffect, useState } from 'react'
import { Timer, ChevronLeft, ChevronRight, Flag, Play, ChevronDown, RotateCcw } from 'lucide-react'
import { CabecalhoPagina } from '../components/AppShell.jsx'
import Questao, { LETRAS } from '../components/Questao.jsx'
import Bloqueado from '../components/Bloqueado.jsx'
import RevisarAssuntos from '../components/RevisarAssuntos.jsx'
import { useAgora } from '../components/Contagem.jsx'
import { AREAS, areaPorId } from '../data/areas.js'
import { QUESTOES } from '../data/questoes/index.js'
import { useStore } from '../lib/store.jsx'
import { embaralhar } from '../lib/util.js'

const POR_AREA = 5
const MIN_POR_QUESTAO = 3

function sortearQuestoes() {
  return AREAS.flatMap((a) =>
    embaralhar(QUESTOES[a.id])
      .slice(0, POR_AREA)
      .map((q) => ({ ...q, area: a.id })),
  )
}

const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function Resultado({ resultado, refazer }) {
  const [aberta, setAberta] = useState(null)
  const { lista, respostas, tempoMs } = resultado
  const acertos = lista.filter((q) => respostas[q.id] === q.correta).length
  const erradas = lista.filter((q) => respostas[q.id] !== q.correta)
  return (
    <div className="space-y-4">
      <div className="animate-pop rounded-3xl bg-navy p-6 text-center text-white">
        <p className="text-sm font-semibold text-white/70">Simulado Relâmpago</p>
        <p className="mt-2 text-6xl font-extrabold text-energia">
          {acertos}
          <span className="text-3xl text-white/60">/{lista.length}</span>
        </p>
        <p className="text-sm text-white/70">
          {Math.round((acertos / lista.length) * 100)}% de acertos · tempo: {mmss(tempoMs)}
        </p>
        <div className="mt-5 grid grid-cols-4 gap-2">
          {AREAS.map((a) => {
            const qs = lista.filter((q) => q.area === a.id)
            const ac = qs.filter((q) => respostas[q.id] === q.correta).length
            return (
              <div key={a.id} className="rounded-2xl bg-white/10 p-2">
                <p className="text-lg">{a.emoji}</p>
                <p className="font-extrabold">
                  {ac}/{qs.length}
                </p>
                <p className="truncate text-[10px] text-white/60">{a.nome}</p>
              </div>
            )
          })}
        </div>
      </div>
      <RevisarAssuntos erradas={erradas} />
      <div className="card">
        <h3 className="mb-3 font-extrabold">Gabarito comentado</h3>
        <ul className="space-y-2">
          {lista.map((q, i) => {
            const r = respostas[q.id]
            const certa = r === q.correta
            return (
              <li key={q.id} className="rounded-2xl bg-navy-50">
                <button onClick={() => setAberta(aberta === i ? null : i)} className="flex w-full items-center gap-3 p-3 text-left">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-extrabold text-white ${certa ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {areaPorId(q.area).emoji} {q.tema}
                  </span>
                  <span className="shrink-0 text-xs font-bold text-navy/60">
                    {r === undefined ? '—' : LETRAS[r]} → {LETRAS[q.correta]}
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition ${aberta === i ? 'rotate-180' : ''}`} />
                </button>
                {aberta === i && (
                  <div className="px-3 pb-3">
                    <Questao questao={q} resposta={r ?? -1} aoResponder={() => {}} mostrarGabarito />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
      <button onClick={refazer} className="btn btn-primario w-full">
        <RotateCcw className="h-5 w-5" /> Fazer outro simulado
      </button>
    </div>
  )
}

export default function Simulado() {
  const { acessoTotal, simulados, responderQuestao, salvarSimulado } = useStore()
  const [fase, setFase] = useState('inicio')
  const [lista, setLista] = useState([])
  const [indice, setIndice] = useState(0)
  const [respostas, setRespostas] = useState({})
  const [inicio, setInicio] = useState(0)
  const [resultado, setResultado] = useState(null)
  const agora = useAgora(1000)

  const duracao = lista.length * MIN_POR_QUESTAO * 60000
  const restante = inicio ? duracao - (agora.getTime() - inicio) : duracao

  const entregar = () => {
    const tempoMs = Math.min(Date.now() - inicio, duracao)
    lista.forEach((q) => responderQuestao(q.area, q.id, respostas[q.id] === q.correta))
    const acertos = lista.filter((q) => respostas[q.id] === q.correta).length
    const porArea = Object.fromEntries(AREAS.map((a) => [a.id, lista.filter((q) => q.area === a.id && respostas[q.id] === q.correta).length]))
    salvarSimulado({ data: new Date().toISOString(), acertos, total: lista.length, porArea, tempoMs })
    setResultado({ lista, respostas, tempoMs })
    setFase('resultado')
    window.scrollTo(0, 0)
  }

  // Tempo esgotado: entrega automaticamente.
  useEffect(() => {
    if (fase === 'prova' && restante <= 0) entregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, restante])

  const comecar = () => {
    setLista(sortearQuestoes())
    setRespostas({})
    setIndice(0)
    setInicio(Date.now())
    setFase('prova')
    window.scrollTo(0, 0)
  }

  if (!acessoTotal) {
    return (
      <div>
        <CabecalhoPagina titulo="Simulado Relâmpago" subtitulo="20 questões · 60 minutos" />
        <Bloqueado titulo="Simulado bloqueado" texto="Treine no clima da prova: 20 questões misturadas com cronômetro e gabarito comentado." />
      </div>
    )
  }

  if (fase === 'resultado') return <Resultado resultado={resultado} refazer={() => setFase('inicio')} />

  if (fase === 'inicio') {
    return (
      <div>
        <CabecalhoPagina titulo="Simulado Relâmpago" subtitulo="Treino no clima da prova" />
        <div className="card space-y-3">
          {[
            ['📝', `${POR_AREA * AREAS.length} questões misturadas (${POR_AREA} de cada área)`],
            ['⏱️', `${POR_AREA * AREAS.length * MIN_POR_QUESTAO} minutos (cerca de ${MIN_POR_QUESTAO} min por questão)`],
            ['🙈', 'O gabarito só aparece no final, igual no ENEM'],
            ['📊', 'Resultado por área + gabarito comentado'],
          ].map(([e, t]) => (
            <p key={t} className="flex items-center gap-3 text-sm font-semibold">
              <span className="text-xl">{e}</span> {t}
            </p>
          ))}
        </div>
        <button onClick={comecar} className="btn btn-primario mt-4 w-full py-4 text-lg">
          <Play className="h-5 w-5" /> Começar simulado
        </button>
        {simulados.length > 0 && (
          <div className="card mt-4">
            <h3 className="mb-2 font-extrabold">Seus últimos simulados</h3>
            <ul className="divide-y divide-navy/5">
              {simulados.slice(0, 5).map((s) => (
                <li key={s.data} className="flex justify-between py-2 text-sm">
                  <span className="text-navy/60">{new Date(s.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="font-bold">
                    {s.acertos}/{s.total} ({Math.round((s.acertos / s.total) * 100)}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  // prova
  const q = lista[indice]
  const respondidas = Object.keys(respostas).length
  const pouco = restante < 5 * 60000
  return (
    <div className="pb-4">
      <div className="sticky top-[3.6rem] z-20 -mx-4 mb-4 bg-navy-50/95 px-4 pb-2 pt-1 backdrop-blur">
        <div className="flex items-center justify-between">
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-sm font-extrabold tabular-nums ${pouco ? 'animate-pulse bg-rose-500 text-white' : 'bg-navy text-energia'}`}
          >
            <Timer className="h-4 w-4" /> {mmss(restante)}
          </span>
          <span className="text-sm font-bold text-navy/60">
            {respondidas}/{lista.length} respondidas
          </span>
        </div>
        <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
          {lista.map((x, i) => (
            <button
              key={x.id}
              onClick={() => setIndice(i)}
              className={`h-8 w-8 shrink-0 rounded-lg text-xs font-bold ${i === indice ? 'bg-energia text-navy ring-2 ring-navy' : respostas[x.id] !== undefined ? 'bg-navy text-white' : 'bg-white ring-1 ring-navy/15'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
      <Questao
        key={q.id}
        questao={q}
        resposta={respostas[q.id]}
        aoResponder={(i) => setRespostas((r) => ({ ...r, [q.id]: i }))}
        rotulo={`Questão ${indice + 1} · ${areaPorId(q.area).nome}`}
      />
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button onClick={() => setIndice(Math.max(0, indice - 1))} disabled={indice === 0} className="btn btn-claro">
          <ChevronLeft className="h-5 w-5" /> Anterior
        </button>
        {indice + 1 < lista.length ? (
          <button onClick={() => setIndice(indice + 1)} className="btn btn-escuro">
            Próxima <ChevronRight className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={() => (respondidas < lista.length ? window.confirm(`Você deixou ${lista.length - respondidas} em branco. Entregar mesmo assim?`) && entregar() : entregar())}
            className="btn btn-primario"
          >
            <Flag className="h-5 w-5" /> Entregar
          </button>
        )}
      </div>
      {indice + 1 < lista.length && respondidas === lista.length && (
        <button onClick={entregar} className="btn btn-primario mt-2 w-full">
          <Flag className="h-5 w-5" /> Entregar simulado
        </button>
      )}
    </div>
  )
}
