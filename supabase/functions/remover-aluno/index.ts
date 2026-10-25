// Remove um aluno: cancela a assinatura no Asaas (e as cobranças em aberto) e apaga do app.
import { corsHeaders, erro, json } from '../_shared/cors.ts'
import { admin, usuarioDaRequisicao } from '../_shared/supabase.ts'
import { asaas, AsaasErro } from '../_shared/asaas.ts'
import { chaveDaSubconta } from '../_shared/personal.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const usuario = await usuarioDaRequisicao(req)
  if (!usuario) return erro('Sua sessão expirou. Entre de novo.', 401)

  const { id } = await req.json().catch(() => ({}))
  if (!id) return erro('Aluno não encontrado.', 404)

  const { data: aluno } = await admin
    .from('alunos')
    .select('id, asaas_cliente_id, asaas_assinatura_id')
    .eq('id', id)
    .eq('personal_id', usuario.id)
    .maybeSingle()
  if (!aluno) return erro('Aluno não encontrado.', 404)

  const apiKey = await chaveDaSubconta(usuario.id)
  if (apiKey && aluno.asaas_assinatura_id) {
    try {
      await asaas('DELETE', `/subscriptions/${aluno.asaas_assinatura_id}`, undefined, apiKey)
    } catch (e) {
      // 404 = já não existe no Asaas; pode seguir
      if (!(e instanceof AsaasErro && e.status === 404)) {
        return erro('Não conseguimos cancelar a cobrança deste aluno, tente de novo.')
      }
    }
    if (aluno.asaas_cliente_id) {
      await asaas('DELETE', `/customers/${aluno.asaas_cliente_id}`, undefined, apiKey).catch(() => {})
    }
  }

  const { error } = await admin.from('alunos').delete().eq('id', aluno.id)
  if (error) {
    console.error(error)
    return erro('Não conseguimos remover o aluno, tente de novo.', 500)
  }
  return json({ ok: true })
})
