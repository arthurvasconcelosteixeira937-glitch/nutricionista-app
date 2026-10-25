import { admin } from './supabase.ts'
import { statusDoPainel } from './asaas.ts'

/** Grava/atualiza a mensalidade de um aluno a partir de um pagamento do Asaas. */
export async function salvarCobrancaAluno(pagamento: any, alunoId: string, personalId: string) {
  const { error } = await admin.from('cobrancas').upsert(
    {
      asaas_pagamento_id: pagamento.id,
      aluno_id: alunoId,
      personal_id: personalId,
      valor: pagamento.value,
      vencimento: pagamento.dueDate,
      status: pagamento.deleted ? 'cancelado' : statusDoPainel(pagamento.status),
      link: pagamento.invoiceUrl ?? null,
      pago_em: pagamento.paymentDate ?? pagamento.clientPaymentDate ?? null,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: 'asaas_pagamento_id' },
  )
  if (error) throw error
}

/** Grava/atualiza uma mensalidade do app (R$ 29,90) paga pelo personal. */
export async function salvarPagamentoApp(pagamento: any, personalId: string) {
  const { error } = await admin.from('pagamentos_app').upsert(
    {
      asaas_pagamento_id: pagamento.id,
      personal_id: personalId,
      valor: pagamento.value,
      vencimento: pagamento.dueDate,
      status: pagamento.deleted ? 'cancelado' : statusDoPainel(pagamento.status),
      link: pagamento.invoiceUrl ?? null,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: 'asaas_pagamento_id' },
  )
  if (error) throw error
}
