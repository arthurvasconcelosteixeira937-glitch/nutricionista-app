// Recebe os avisos do Asaas e atualiza o painel sozinho.
// Serve tanto para as mensalidades dos alunos (subcontas)
// quanto para a assinatura do app paga pelo personal (conta principal).
import { json } from '../_shared/cors.ts'
import { admin } from '../_shared/supabase.ts'
import { salvarCobrancaAluno, salvarPagamentoApp } from '../_shared/cobrancas.ts'

const TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN')

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: true })

  if (!TOKEN) {
    console.error('Configure o segredo ASAAS_WEBHOOK_TOKEN')
    return json({ erro: 'webhook não configurado' }, 500)
  }
  if (req.headers.get('asaas-access-token') !== TOKEN) {
    return json({ erro: 'não autorizado' }, 401)
  }

  const aviso = await req.json().catch(() => null)
  const evento: string = aviso?.event ?? ''
  const pagamento = aviso?.payment

  // Só nos interessam avisos de pagamento ligados a uma assinatura
  if (!evento.startsWith('PAYMENT_') || !pagamento?.id || !pagamento.subscription) {
    return json({ ok: true, ignorado: true })
  }
  if (evento === 'PAYMENT_DELETED') pagamento.deleted = true

  try {
    // Mensalidade de aluno?
    const { data: aluno } = await admin
      .from('alunos')
      .select('id, personal_id')
      .eq('asaas_assinatura_id', pagamento.subscription)
      .maybeSingle()
    if (aluno) {
      await salvarCobrancaAluno(pagamento, aluno.id, aluno.personal_id)
      return json({ ok: true })
    }

    // Assinatura do app paga pelo personal?
    const { data: personal } = await admin
      .from('personais')
      .select('id')
      .eq('assinatura_id', pagamento.subscription)
      .maybeSingle()
    if (personal) {
      await salvarPagamentoApp(pagamento, personal.id)
      return json({ ok: true })
    }
  } catch (e) {
    console.error('Erro ao processar aviso do Asaas', evento, pagamento.id, e)
    // 500 faz o Asaas tentar de novo depois
    return json({ erro: 'falha ao salvar' }, 500)
  }

  return json({ ok: true, ignorado: true })
})
