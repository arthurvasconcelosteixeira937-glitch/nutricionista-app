// Finaliza o cadastro do personal:
// 1) cria a SUBCONTA no Asaas (onde ele recebe as mensalidades dos alunos);
// 2) cria o personal como cliente na conta principal;
// 3) cria a assinatura do app (R$ 29,90/mês) com 7 dias grátis.
// Pode ser chamada de novo com segurança: cada etapa já feita é pulada.
import { corsHeaders, erro, json } from '../_shared/cors.ts'
import { admin, usuarioDaRequisicao } from '../_shared/supabase.ts'
import {
  asaas,
  DIAS_TESTE_GRATIS,
  hojeBR,
  mensagemDeErro,
  pagamentosDaAssinatura,
  somarDias,
  soNumeros,
  VALOR_ASSINATURA_APP,
} from '../_shared/asaas.ts'
import { salvarPagamentoApp } from '../_shared/cobrancas.ts'

const TIPOS_EMPRESA = ['MEI', 'LIMITED', 'INDIVIDUAL', 'ASSOCIATION']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const usuario = await usuarioDaRequisicao(req)
  if (!usuario) return erro('Sua sessão expirou. Entre de novo.', 401)

  let d: any
  try {
    d = await req.json()
  } catch {
    return erro('Não conseguimos ler os dados. Tente de novo.')
  }

  const dados = {
    nome: String(d.nome ?? '').trim(),
    whatsapp: soNumeros(d.whatsapp),
    cpf_cnpj: soNumeros(d.cpfCnpj),
    tipo_empresa: d.tipoEmpresa ? String(d.tipoEmpresa) : null,
    nascimento: d.nascimento ? String(d.nascimento) : null,
    cep: soNumeros(d.cep),
    endereco: String(d.endereco ?? '').trim(),
    numero: String(d.numero ?? '').trim(),
    bairro: String(d.bairro ?? '').trim(),
    renda_mensal: Number(d.rendaMensal),
  }

  if (dados.nome.split(' ').filter(Boolean).length < 2) return erro('Digite seu nome completo.')
  if (dados.whatsapp.length < 10 || dados.whatsapp.length > 11) return erro('Confira o número do WhatsApp (com DDD).')
  if (dados.cpf_cnpj.length !== 11 && dados.cpf_cnpj.length !== 14) return erro('Confira o CPF ou CNPJ.')
  const ehCnpj = dados.cpf_cnpj.length === 14
  if (ehCnpj && !TIPOS_EMPRESA.includes(dados.tipo_empresa ?? '')) return erro('Escolha o tipo da sua empresa.')
  if (!ehCnpj) dados.tipo_empresa = null
  if (!ehCnpj && !/^\d{4}-\d{2}-\d{2}$/.test(dados.nascimento ?? '')) return erro('Informe sua data de nascimento.')
  if (dados.cep.length !== 8) return erro('Confira o CEP.')
  if (!dados.endereco || !dados.numero || !dados.bairro) return erro('Preencha o endereço completo.')
  if (!(dados.renda_mensal > 0)) return erro('Informe sua renda mensal aproximada.')

  const email = usuario.email!

  // Salva (ou atualiza) os dados do personal
  const { data: atual } = await admin.from('personais').select('*').eq('id', usuario.id).maybeSingle()
  const { error: erroSalvar } = await admin
    .from('personais')
    .upsert({ id: usuario.id, email, ...dados }, { onConflict: 'id' })
  if (erroSalvar) {
    console.error(erroSalvar)
    return erro('Não conseguimos salvar seus dados, tente de novo.', 500)
  }
  const personal = { ...(atual ?? {}), ...dados, id: usuario.id, email }

  // 1) Subconta no Asaas
  if (!personal.asaas_wallet_id) {
    const webhookToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN')
    const corpo: Record<string, unknown> = {
      name: dados.nome,
      email,
      cpfCnpj: dados.cpf_cnpj,
      mobilePhone: dados.whatsapp,
      incomeValue: dados.renda_mensal,
      address: dados.endereco,
      addressNumber: dados.numero,
      province: dados.bairro,
      postalCode: dados.cep,
    }
    if (ehCnpj) corpo.companyType = dados.tipo_empresa
    else corpo.birthDate = dados.nascimento
    // A subconta já nasce avisando o nosso webhook sobre os pagamentos dos alunos
    if (webhookToken) {
      corpo.webhooks = [
        {
          name: 'Aluno em Dia',
          url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/asaas-webhook`,
          email,
          sendType: 'SEQUENTIALLY',
          apiVersion: 3,
          enabled: true,
          interrupted: false,
          authToken: webhookToken,
          events: [
            'PAYMENT_CREATED',
            'PAYMENT_UPDATED',
            'PAYMENT_RECEIVED',
            'PAYMENT_CONFIRMED',
            'PAYMENT_OVERDUE',
            'PAYMENT_DELETED',
            'PAYMENT_RESTORED',
            'PAYMENT_REFUNDED',
          ],
        },
      ]
    }

    try {
      const conta = await asaas('POST', '/accounts', corpo)
      const { error: e1 } = await admin
        .from('personais')
        .update({ asaas_conta_id: conta.id, asaas_wallet_id: conta.walletId })
        .eq('id', usuario.id)
      const { error: e2 } = await admin
        .from('personais_chaves')
        .upsert({ personal_id: usuario.id, asaas_api_key: conta.apiKey }, { onConflict: 'personal_id' })
      if (e1 || e2) {
        console.error('Subconta criada mas não salva', conta.id, e1, e2)
        return erro('Não conseguimos finalizar seu cadastro, tente de novo.', 500)
      }
      personal.asaas_wallet_id = conta.walletId
    } catch (e) {
      return erro(mensagemDeErro(e, 'Não conseguimos criar sua conta de recebimentos, tente de novo.'))
    }
  }

  // 2) Personal como cliente da conta principal
  if (!personal.asaas_cliente_id) {
    try {
      const cliente = await asaas('POST', '/customers', {
        name: dados.nome,
        email,
        cpfCnpj: dados.cpf_cnpj,
        mobilePhone: dados.whatsapp,
        postalCode: dados.cep,
        address: dados.endereco,
        addressNumber: dados.numero,
        province: dados.bairro,
        externalReference: usuario.id,
        notificationDisabled: false,
      })
      await admin.from('personais').update({ asaas_cliente_id: cliente.id }).eq('id', usuario.id)
      personal.asaas_cliente_id = cliente.id
    } catch (e) {
      return erro(mensagemDeErro(e, 'Não conseguimos ativar sua assinatura, tente de novo.'))
    }
  }

  // 3) Assinatura do app: 7 dias grátis, depois R$ 29,90/mês
  if (!personal.assinatura_id) {
    const testeAte = somarDias(hojeBR(), DIAS_TESTE_GRATIS)
    try {
      const assinatura = await asaas('POST', '/subscriptions', {
        customer: personal.asaas_cliente_id,
        billingType: 'UNDEFINED',
        value: VALOR_ASSINATURA_APP,
        nextDueDate: testeAte,
        cycle: 'MONTHLY',
        description: 'Assinatura Aluno em Dia',
        externalReference: usuario.id,
      })
      await admin
        .from('personais')
        .update({ assinatura_id: assinatura.id, teste_ate: testeAte })
        .eq('id', usuario.id)
      for (const p of await pagamentosDaAssinatura(assinatura.id)) {
        await salvarPagamentoApp(p, usuario.id)
      }
    } catch (e) {
      console.error(e)
      return erro(mensagemDeErro(e, 'Não conseguimos ativar sua assinatura, tente de novo.'))
    }
  }

  return json({ ok: true })
})
