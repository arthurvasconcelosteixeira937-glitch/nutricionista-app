// Adiciona ou edita um aluno.
// Novo aluno: cria o cliente na subconta do personal e uma assinatura mensal
// (Pix, boleto ou cartão, à escolha do aluno) com R$ 0,99 de split para a conta principal.
import { corsHeaders, erro, json } from '../_shared/cors.ts'
import { admin, appBloqueado, usuarioDaRequisicao } from '../_shared/supabase.ts'
import {
  asaas,
  ASAAS_WALLET_ID,
  mensagemDeErro,
  pagamentosDaAssinatura,
  proximoVencimento,
  soNumeros,
  SPLIT_PLATAFORMA,
} from '../_shared/asaas.ts'
import { salvarCobrancaAluno } from '../_shared/cobrancas.ts'
import { chaveDaSubconta } from '../_shared/personal.ts'

const ERRO_COBRANCA = 'Não conseguimos criar a cobrança, tente de novo.'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const usuario = await usuarioDaRequisicao(req)
  if (!usuario) return erro('Sua sessão expirou. Entre de novo.', 401)
  if (await appBloqueado(usuario.id)) return erro('Renove sua assinatura para continuar.', 403)

  let d: any
  try {
    d = await req.json()
  } catch {
    return erro('Não conseguimos ler os dados. Tente de novo.')
  }

  const nome = String(d.nome ?? '').trim()
  const whatsapp = soNumeros(d.whatsapp)
  const cpf = soNumeros(d.cpf) || null
  const valor = Math.round(Number(d.valor) * 100) / 100
  const dia = Number(d.diaVencimento)

  if (!nome) return erro('Digite o nome do aluno.')
  if (whatsapp.length < 10 || whatsapp.length > 11) return erro('Confira o WhatsApp do aluno (com DDD).')
  if (cpf && cpf.length !== 11) return erro('Confira o CPF do aluno.')
  if (!(valor >= 5)) return erro('A mensalidade precisa ser de pelo menos R$ 5,00.')
  if (!Number.isInteger(dia) || dia < 1 || dia > 28) return erro('Escolha um dia de vencimento entre 1 e 28.')

  const apiKey = await chaveDaSubconta(usuario.id)
  if (!apiKey) return erro('Termine seu cadastro antes de adicionar alunos.')

  const split = [{ walletId: ASAAS_WALLET_ID, fixedValue: SPLIT_PLATAFORMA }]
  const clienteAsaas: Record<string, unknown> = { name: nome, mobilePhone: whatsapp }
  if (cpf) clienteAsaas.cpfCnpj = cpf

  // ---------- Editar aluno ----------
  if (d.id) {
    const { data: aluno } = await admin
      .from('alunos')
      .select('*')
      .eq('id', d.id)
      .eq('personal_id', usuario.id)
      .maybeSingle()
    if (!aluno) return erro('Aluno não encontrado.', 404)

    try {
      await asaas('PUT', `/customers/${aluno.asaas_cliente_id}`, clienteAsaas, apiKey)
      const mudou = Number(aluno.valor) !== valor || aluno.dia_vencimento !== dia || aluno.nome !== nome
      if (mudou) {
        const assinatura: Record<string, unknown> = {
          value: valor,
          description: `Mensalidade - ${nome}`,
          split,
          updatePendingPayments: true,
        }
        if (aluno.dia_vencimento !== dia) assinatura.nextDueDate = proximoVencimento(dia)
        await asaas('PUT', `/subscriptions/${aluno.asaas_assinatura_id}`, assinatura, apiKey)
      }
    } catch (e) {
      return erro(mensagemDeErro(e, 'Não conseguimos atualizar a cobrança, tente de novo.'))
    }

    const { error } = await admin
      .from('alunos')
      .update({ nome, whatsapp, cpf, valor, dia_vencimento: dia })
      .eq('id', aluno.id)
    if (error) {
      console.error(error)
      return erro('Não conseguimos salvar o aluno, tente de novo.', 500)
    }
    await atualizarCobrancas(aluno.asaas_assinatura_id, aluno.id, usuario.id, apiKey)
    return json({ ok: true, id: aluno.id })
  }

  // ---------- Novo aluno ----------
  const alunoId = crypto.randomUUID()
  let clienteId: string
  let assinaturaId: string
  try {
    const cliente = await asaas('POST', '/customers', { ...clienteAsaas, externalReference: alunoId }, apiKey)
    clienteId = cliente.id
  } catch (e) {
    return erro(mensagemDeErro(e, ERRO_COBRANCA))
  }

  try {
    const assinatura = await asaas(
      'POST',
      '/subscriptions',
      {
        customer: clienteId,
        billingType: 'UNDEFINED',
        value: valor,
        nextDueDate: proximoVencimento(dia),
        cycle: 'MONTHLY',
        description: `Mensalidade - ${nome}`,
        externalReference: alunoId,
        split,
      },
      apiKey,
    )
    assinaturaId = assinatura.id
  } catch (e) {
    await asaas('DELETE', `/customers/${clienteId}`, undefined, apiKey).catch(() => {})
    return erro(mensagemDeErro(e, ERRO_COBRANCA))
  }

  const { error } = await admin.from('alunos').insert({
    id: alunoId,
    personal_id: usuario.id,
    nome,
    whatsapp,
    cpf,
    valor,
    dia_vencimento: dia,
    asaas_cliente_id: clienteId,
    asaas_assinatura_id: assinaturaId,
  })
  if (error) {
    console.error(error)
    // Desfaz no Asaas para não cobrar um aluno que não aparece no app
    await asaas('DELETE', `/subscriptions/${assinaturaId}`, undefined, apiKey).catch(() => {})
    await asaas('DELETE', `/customers/${clienteId}`, undefined, apiKey).catch(() => {})
    return erro('Não conseguimos salvar o aluno, tente de novo.', 500)
  }

  await atualizarCobrancas(assinaturaId, alunoId, usuario.id, apiKey)
  return json({ ok: true, id: alunoId })
})

/** Traz as cobranças da assinatura para o painel (o webhook mantém atualizado depois). */
async function atualizarCobrancas(assinaturaId: string, alunoId: string, personalId: string, apiKey: string) {
  try {
    for (const p of await pagamentosDaAssinatura(assinaturaId, apiKey)) {
      await salvarCobrancaAluno(p, alunoId, personalId)
    }
  } catch (e) {
    // Não é grave: o webhook do Asaas também avisa sobre novas cobranças
    console.error('Falha ao buscar cobranças', e)
  }
}
