// Regras do que é liberado no plano grátis.
import { LIMITES_GRATIS } from '../data/planos.js'
import { QUESTOES } from '../data/questoes/index.js'
import { resumosDaArea, resumoPorId } from '../data/resumos.js'
import { FLASHCARDS } from '../data/flashcards.js'

export const questoesLiberadas = (area, acessoTotal) => (acessoTotal ? QUESTOES[area] : QUESTOES[area].slice(0, LIMITES_GRATIS.questoesPorArea))

export function resumoLiberado(id, acessoTotal) {
  if (acessoTotal) return true
  const r = resumoPorId(id)
  return !!r && resumosDaArea(r.area).findIndex((x) => x.id === id) < LIMITES_GRATIS.resumosPorArea
}

export const flashcardsLiberados = (acessoTotal) => (acessoTotal ? FLASHCARDS : FLASHCARDS.slice(0, LIMITES_GRATIS.flashcards))
