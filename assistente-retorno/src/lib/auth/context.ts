export type Role = "owner" | "staff";

/** Contexto de autorização resolvido no servidor a partir da sessão. Nunca vem do cliente. */
export interface TenantContext {
  tenantId: string;
  userId: string;
  role: Role;
}
