import { PROVA_DIA_1, PROVA_DIA_2 } from '../data/config.js'

// Qual contagem mostrar: até 8/11 13h30 → 1º dia; depois, até 15/11 13h30 → 2º dia.
export function alvoDaContagem(agora = new Date()) {
  if (agora < PROVA_DIA_1) return { alvo: PROVA_DIA_1, rotulo: '1º dia do ENEM', data: '8/11' }
  if (agora < PROVA_DIA_2) return { alvo: PROVA_DIA_2, rotulo: '2º dia do ENEM', data: '15/11' }
  return null
}

export function partesDoTempo(ms) {
  const total = Math.max(0, ms)
  return {
    total,
    dias: Math.floor(total / 86400000),
    horas: Math.floor((total / 3600000) % 24),
    minutos: Math.floor((total / 60000) % 60),
    segundos: Math.floor((total / 1000) % 60),
  }
}
