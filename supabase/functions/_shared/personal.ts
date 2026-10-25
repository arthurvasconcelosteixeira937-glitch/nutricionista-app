import { admin } from './supabase.ts'

/** Busca a chave da subconta do personal (só existe no servidor). */
export async function chaveDaSubconta(personalId: string): Promise<string | null> {
  const { data } = await admin
    .from('personais_chaves')
    .select('asaas_api_key')
    .eq('personal_id', personalId)
    .maybeSingle()
  return data?.asaas_api_key ?? null
}
