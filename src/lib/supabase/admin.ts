import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env";

let admin: SupabaseClient | null = null;

/**
 * Cliente com SERVICE ROLE: ignora RLS. Só no servidor, e sempre depois de
 * verificar quem é o usuário e se ele pode fazer a operação.
 */
export function createAdminClient(): SupabaseClient {
  if (!admin) {
    admin = createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}
