import { createClient, type SupabaseClient, type User } from 'jsr:@supabase/supabase-js@2'

/** Cliente com service role: ignora RLS. Usar só dentro das Edge Functions. */
export const admin: SupabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
)

/** Descobre qual personal fez a chamada a partir do token de login. */
export async function usuarioDaRequisicao(req: Request): Promise<User | null> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  if (error) return null
  return data.user
}

/** Mesmo critério da função app_bloqueado() do banco. */
export async function appBloqueado(personalId: string): Promise<boolean> {
  const { data } = await admin.rpc('app_bloqueado_para', { p_personal: personalId })
  return data === true
}
