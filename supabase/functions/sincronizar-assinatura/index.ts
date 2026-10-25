// Busca no Asaas a situação da assinatura do app do personal.
// Usada no botão "Já paguei" da tela de bloqueio (caso algum aviso do webhook se perca).
import { corsHeaders, erro, json } from '../_shared/cors.ts'
import { admin, appBloqueado, usuarioDaRequisicao } from '../_shared/supabase.ts'
import { pagamentosDaAssinatura } from '../_shared/asaas.ts'
import { salvarPagamentoApp } from '../_shared/cobrancas.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const usuario = await usuarioDaRequisicao(req)
  if (!usuario) return erro('Sua sessão expirou. Entre de novo.', 401)

  const { data: personal } = await admin
    .from('personais')
    .select('assinatura_id')
    .eq('id', usuario.id)
    .maybeSingle()

  if (personal?.assinatura_id) {
    try {
      for (const p of await pagamentosDaAssinatura(personal.assinatura_id)) {
        await salvarPagamentoApp(p, usuario.id)
      }
    } catch (e) {
      console.error(e)
      return erro('Não conseguimos verificar seu pagamento, tente de novo.')
    }
  }

  return json({ ok: true, bloqueado: await appBloqueado(usuario.id) })
})
