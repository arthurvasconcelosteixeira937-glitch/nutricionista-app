import type { Cobranca, Status } from './tipos'
import { hoje, mesAtual } from './formato'

/**
 * Escolhe qual mensalidade mostrar para o aluno no painel:
 * 1) a atrasada mais antiga; 2) a deste mês; 3) a próxima em aberto; 4) a última paga.
 */
export function cobrancaDoMomento(cobrancas: Cobranca[]): Cobranca | null {
  const ativas = cobrancas
    .filter((c) => c.status !== 'cancelado')
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))

  const atrasada = ativas.find((c) => c.status === 'atrasado')
  if (atrasada) return atrasada

  const mes = mesAtual()
  const doMes = ativas.find((c) => c.vencimento.startsWith(mes))
  if (doMes) return doMes

  const proxima = ativas.find((c) => c.status === 'aguardando' && c.vencimento >= hoje())
  if (proxima) return proxima

  const pagas = ativas.filter((c) => c.status === 'pago')
  return pagas[pagas.length - 1] ?? null
}

export const TEXTO_STATUS: Record<Status, string> = {
  pago: 'Pago',
  aguardando: 'Aguardando',
  atrasado: 'Atrasado',
  cancelado: 'Cancelado',
}
