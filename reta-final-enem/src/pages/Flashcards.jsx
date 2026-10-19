import { useMemo, useState } from 'react'
import { RotateCcw, ThumbsUp, ThumbsDown, Hand } from 'lucide-react'
import { CabecalhoPagina } from '../components/AppShell.jsx'
import Bloqueado from '../components/Bloqueado.jsx'
import { areaPorId } from '../data/areas.js'
import { FLASHCARDS } from '../data/flashcards.js'
import { flashcardsLiberados } from '../lib/acesso.js'
import { useStore } from '../lib/store.jsx'
import { embaralhar } from '../lib/util.js'

// Fila de cards: "Sabia" tira da fila; "Não sabia" devolve o card 3 posições depois.
export default function Flashcards() {
  const { acessoTotal, flashcards, responderFlashcard } = useStore()
  const baralho = useMemo(() => flashcardsLiberados(acessoTotal), [acessoTotal])
  const [fila, setFila] = useState(() => embaralhar(baralho))
  const [virado, setVirado] = useState(false)
  const [rodada, setRodada] = useState({ sabia: 0, nao: 0 })

  const dominados = baralho.filter((c) => flashcards.sabia[c.id]).length
  const card = fila[0]

  const responder = (sabia) => {
    responderFlashcard(card.id, sabia)
    setRodada((r) => (sabia ? { ...r, sabia: r.sabia + 1 } : { ...r, nao: r.nao + 1 }))
    setVirado(false)
    setFila((f) => {
      const [atual, ...resto] = f
      if (sabia) return resto
      const pos = Math.min(3, resto.length)
      return [...resto.slice(0, pos), atual, ...resto.slice(pos)]
    })
  }

  const reiniciar = (soErrados) => {
    const base = soErrados ? baralho.filter((c) => !flashcards.sabia[c.id]) : baralho
    setFila(embaralhar(base.length ? base : baralho))
    setRodada({ sabia: 0, nao: 0 })
    setVirado(false)
  }

  return (
    <div>
      <CabecalhoPagina titulo="Flashcards" subtitulo={`${dominados} de ${baralho.length} dominados`} />
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-white ring-1 ring-navy/10">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(dominados / baralho.length) * 100}%` }} />
      </div>

      {card ? (
        <>
          <p className="mb-2 text-center text-xs font-bold text-navy/50">
            {fila.length} na fila · ✅ {rodada.sabia} · 🔁 {rodada.nao}
          </p>
          <button key={card.id} onClick={() => setVirado((v) => !v)} className={`flip block h-72 w-full ${virado ? 'virado' : ''}`} aria-label="Virar card">
            <div className="flip-inner relative h-full w-full">
              <div className="flip-face absolute inset-0 flex flex-col rounded-3xl bg-white p-6 shadow-xl ring-1 ring-navy/10">
                <span className="self-start rounded-full px-3 py-1 text-xs font-bold" style={{ background: areaPorId(card.area).corClara, color: areaPorId(card.area).cor }}>
                  {areaPorId(card.area).emoji} {areaPorId(card.area).nome}
                </span>
                <p className="my-auto text-center text-xl font-extrabold leading-snug">{card.frente}</p>
                <span className="flex items-center justify-center gap-1 text-xs font-semibold text-navy/40">
                  <Hand className="h-4 w-4" /> Toque para ver a resposta
                </span>
              </div>
              <div className="flip-face flip-verso absolute inset-0 flex flex-col rounded-3xl bg-navy p-6 text-white shadow-xl">
                <span className="text-xs font-bold uppercase tracking-wider text-energia">Resposta</span>
                <p className="my-auto text-center text-lg font-bold leading-relaxed">{card.verso}</p>
              </div>
            </div>
          </button>
          <div className={`mt-4 grid grid-cols-2 gap-3 transition ${virado ? 'opacity-100' : 'pointer-events-none opacity-30'}`}>
            <button onClick={() => responder(false)} className="btn bg-rose-500 text-white">
              <ThumbsDown className="h-5 w-5" /> Não sabia
            </button>
            <button onClick={() => responder(true)} className="btn bg-emerald-500 text-white">
              <ThumbsUp className="h-5 w-5" /> Sabia
            </button>
          </div>
          {!virado && <p className="mt-2 text-center text-xs text-navy/50">Pense na resposta, vire o card e seja sincero 😉</p>}
        </>
      ) : (
        <div className="card animate-pop text-center">
          <p className="text-5xl">🎉</p>
          <h2 className="mt-2 text-xl font-extrabold">Rodada concluída!</h2>
          <p className="mt-1 text-sm text-navy/60">
            Você acertou de primeira {rodada.sabia} e repetiu {rodada.nao} {rodada.nao === 1 ? 'vez' : 'vezes'}.
          </p>
          <div className="mt-4 grid gap-2">
            <button onClick={() => reiniciar(true)} className="btn btn-primario">
              <RotateCcw className="h-5 w-5" /> Revisar os que ainda não domino
            </button>
            <button onClick={() => reiniciar(false)} className="btn btn-claro">
              Embaralhar todos de novo
            </button>
          </div>
        </div>
      )}

      {!acessoTotal && (
        <div className="mt-6">
          <Bloqueado titulo={`+${FLASHCARDS.length - baralho.length} flashcards`} texto="Libere os 40 flashcards com fórmulas e conceitos que mais caem." />
        </div>
      )}
    </div>
  )
}
