import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { carregar, salvar } from './storage.js'
import { hojeISO, ontemISO } from './util.js'
import { rastrear } from './pixel.js'
import { PLANO_21 } from '../data/plano21.js'

// Tudo o que o app guarda no aparelho (localStorage).
const INICIAL = {
  usuario: null, // { nome, whatsapp, email, criadoEm }
  plano: 'gratis', // 'gratis' | 'completo' | 'combo' (liberado depois do pagamento)
  ebooks: [], // ids dos e-books comprados
  modoTeste: false, // libera tudo (tocar 5x no logo)
  xp: 0,
  ofensiva: { dias: 0, ultimo: null }, // dias seguidos estudando
  tarefas: {}, // { 'dia-indice': true }
  quiz: {}, // { area: { respondidas, acertos, rodadas, melhor, erradas: { idQuestao: true } } }
  flashcards: { sabia: {}, revisados: 0 },
  simulados: [], // [{ data, acertos, total, porArea }]
  checkProva: {},
  checkRedacao: {},
}

const Contexto = createContext(null)

// Soma XP e atualiza a ofensiva (dias seguidos com alguma atividade).
function comAtividade(s, xp = 0) {
  const hoje = hojeISO()
  let { dias, ultimo } = s.ofensiva
  if (ultimo !== hoje) dias = ultimo === ontemISO() ? dias + 1 : 1
  return { ...s, xp: s.xp + xp, ofensiva: { dias, ultimo: hoje } }
}

export function StoreProvider({ children }) {
  const [estado, setEstado] = useState(() => ({ ...INICIAL, ...(carregar() || {}) }))

  useEffect(() => salvar(estado), [estado])

  const entrar = useCallback((dados) => {
    setEstado((s) => comAtividade({ ...s, usuario: { ...dados, criadoEm: s.usuario?.criadoEm || new Date().toISOString() } }))
    rastrear('Lead', { content_name: 'Cadastro Reta Final ENEM' })
  }, [])

  const sair = useCallback(() => setEstado({ ...INICIAL }), [])

  const alternarTarefa = useCallback((dia, i) => {
    setEstado((s) => {
      const chave = `${dia}-${i}`
      const feita = !s.tarefas[chave]
      const tarefas = { ...s.tarefas, [chave]: feita }
      return feita ? comAtividade({ ...s, tarefas }, 20) : { ...s, tarefas, xp: Math.max(0, s.xp - 20) }
    })
  }, [])

  const responderQuestao = useCallback((area, idQuestao, acertou) => {
    setEstado((s) => {
      const atual = s.quiz[area] || { respondidas: 0, acertos: 0, rodadas: 0, melhor: 0, erradas: {} }
      const erradas = { ...atual.erradas }
      if (acertou) delete erradas[idQuestao]
      else erradas[idQuestao] = true
      const quiz = { ...s.quiz, [area]: { ...atual, respondidas: atual.respondidas + 1, acertos: atual.acertos + (acertou ? 1 : 0), erradas } }
      return comAtividade({ ...s, quiz }, acertou ? 10 : 2)
    })
  }, [])

  const finalizarRodada = useCallback((area, acertos, total) => {
    setEstado((s) => {
      const atual = s.quiz[area] || { respondidas: 0, acertos: 0, rodadas: 0, melhor: 0, erradas: {} }
      const pct = total ? Math.round((acertos / total) * 100) : 0
      return { ...s, quiz: { ...s.quiz, [area]: { ...atual, rodadas: atual.rodadas + 1, melhor: Math.max(atual.melhor, pct) } } }
    })
  }, [])

  const responderFlashcard = useCallback((id, sabia) => {
    setEstado((s) => {
      const mapa = { ...s.flashcards.sabia, [id]: sabia }
      return comAtividade({ ...s, flashcards: { sabia: mapa, revisados: s.flashcards.revisados + 1 } }, sabia ? 3 : 1)
    })
  }, [])

  const salvarSimulado = useCallback((resultado) => {
    setEstado((s) => comAtividade({ ...s, simulados: [resultado, ...s.simulados].slice(0, 20) }, 50 + resultado.acertos * 5))
  }, [])

  const alternarCheck = useCallback((lista, id) => {
    setEstado((s) => ({ ...s, [lista]: { ...s[lista], [id]: !s[lista][id] } }))
  }, [])

  const alternarModoTeste = useCallback(() => setEstado((s) => ({ ...s, modoTeste: !s.modoTeste })), [])

  // Chamado pela função de pagamento quando ela estiver pronta (ver lib/checkout.js).
  const liberarCompra = useCallback((pedido) => {
    setEstado((s) => {
      let plano = s.plano
      let ebooks = [...s.ebooks]
      for (const item of pedido.itens) {
        if (item.id === 'combo') plano = 'combo'
        else if (item.id === 'completo' && plano !== 'combo') plano = 'completo'
        if (item.ebooks) ebooks = [...new Set([...ebooks, ...item.ebooks])]
      }
      return { ...s, plano, ebooks }
    })
  }, [])

  const valor = useMemo(() => {
    const acessoTotal = estado.modoTeste || estado.plano === 'completo' || estado.plano === 'combo'
    const temEbook = (id) => estado.modoTeste || estado.plano === 'combo' || estado.ebooks.includes(id)
    const diaAtual = (() => {
      const pendente = PLANO_21.find((d) => d.tarefas.some((_, i) => !estado.tarefas[`${d.dia}-${i}`]))
      return pendente ? pendente.dia : PLANO_21.length
    })()
    const totalTarefas = PLANO_21.reduce((n, d) => n + d.tarefas.length, 0)
    const tarefasFeitas = Object.values(estado.tarefas).filter(Boolean).length
    const ultimo = estado.ofensiva.ultimo
    const ofensivaAtiva = ultimo === hojeISO() || ultimo === ontemISO() ? estado.ofensiva.dias : 0
    return {
      ...estado,
      acessoTotal,
      temEbook,
      diaAtual,
      progresso: Math.round((tarefasFeitas / totalTarefas) * 100),
      tarefasFeitas,
      totalTarefas,
      ofensivaAtiva,
      entrar,
      sair,
      alternarTarefa,
      responderQuestao,
      finalizarRodada,
      responderFlashcard,
      salvarSimulado,
      alternarCheck,
      alternarModoTeste,
      liberarCompra,
    }
  }, [estado, entrar, sair, alternarTarefa, responderQuestao, finalizarRodada, responderFlashcard, salvarSimulado, alternarCheck, alternarModoTeste, liberarCompra])

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export const useStore = () => useContext(Contexto)
