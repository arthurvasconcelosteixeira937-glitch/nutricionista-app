import "server-only";
// Regras de criação e cancelamento de cobros (sempre no servidor).
import { z } from "zod";
import { computeAccess } from "./billing/access";
import { generatePublicCode } from "./codes";
import { env } from "./env";
import { parseAmountInput } from "./format";
import { createPreference, expirePreference } from "./mercadopago/api";
import { getMpAccount, getValidAccessToken } from "./mercadopago/tokens";
import { normalizeMxPhone } from "./phone";
import { createAdminClient } from "./supabase/admin";
import { endOfMxDayFromIsoDate, toMxIsoWithOffset, todayMxIso } from "./time";
import type { Cobro, Subscription } from "./types";

export const cobroInputSchema = z.object({
  customer_name: z.string().trim().min(1, "Escribe el nombre de tu cliente").max(80, "Máximo 80 caracteres"),
  customer_phone: z
    .string()
    .trim()
    .refine((v) => normalizeMxPhone(v) !== null, "WhatsApp inválido: deben ser 10 dígitos de México"),
  amount: z
    .string()
    .trim()
    .refine((v) => parseAmountInput(v) !== null, "Monto inválido (mínimo $1.00, máximo 2 decimales)"),
  description: z.string().trim().min(1, "Describe qué estás cobrando").max(200, "Máximo 200 caracteres"),
  due_date: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || endOfMxDayFromIsoDate(v) !== null, "Fecha inválida")
    .refine((v) => !v || v >= todayMxIso(), "La fecha de vencimiento no puede ser en el pasado"),
  reminders_enabled: z.boolean().default(true),
});

export type CobroInput = z.infer<typeof cobroInputSchema>;

export class CobroError extends Error {}

export async function createCobro(sellerId: string, input: CobroInput): Promise<Cobro> {
  const admin = createAdminClient();

  // 1) Bloqueio por assinatura (checado no servidor, nunca só na tela)
  const { data: sub } = await admin.from("subscriptions").select("*").eq("seller_id", sellerId).maybeSingle();
  if (!computeAccess((sub as Subscription | null) ?? null).canCreateCobros) {
    throw new CobroError("Tu suscripción no está activa. Actívala para crear cobros nuevos.");
  }

  // 2) Conta Mercado Pago conectada
  const account = await getMpAccount(sellerId);
  if (!account) throw new CobroError("Primero conecta tu cuenta de Mercado Pago.");
  const token = await getValidAccessToken(account);

  const amount = parseAmountInput(input.amount)!;
  const phone = normalizeMxPhone(input.customer_phone)!;
  const due = input.due_date ? endOfMxDayFromIsoDate(input.due_date) : null;

  // 3) Cria o cobro (pendente) para ter o id usado como external_reference
  let cobro: Cobro | null = null;
  for (let attempt = 0; attempt < 3 && !cobro; attempt++) {
    const { data, error } = await admin
      .from("cobros")
      .insert({
        seller_id: sellerId,
        public_code: generatePublicCode(),
        customer_name: input.customer_name,
        customer_phone: phone,
        amount,
        description: input.description,
        due_at: due?.toISOString() ?? null,
        reminders_enabled: input.reminders_enabled,
      })
      .select("*")
      .single();
    if (!error) cobro = data as Cobro;
    else if (error.code !== "23505") throw new Error(error.message); // 23505 = código repetido, tenta outro
  }
  if (!cobro) throw new Error("No se pudo generar el código del cobro");

  // 4) Preferência do Checkout Pro na conta do vendedor
  try {
    const pref = await createPreference(token, {
      cobroId: cobro.id,
      publicCode: cobro.public_code,
      title: input.description,
      amount,
      appUrl: env.appUrl(),
      expiresAt: due ? toMxIsoWithOffset(due) : undefined,
    });
    const { data, error } = await admin
      .from("cobros")
      .update({ mp_preference_id: pref.id, checkout_url: pref.init_point })
      .eq("id", cobro.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as Cobro;
  } catch (e) {
    // Sem link de pagamento o cobro não serve: removemos para não ficar lixo.
    await admin.from("cobros").delete().eq("id", cobro.id);
    console.error("[cobros] error creando preferencia", e);
    throw new CobroError("Mercado Pago no pudo crear el link de pago. Intenta de nuevo en unos minutos.");
  }
}

export async function cancelCobro(sellerId: string, cobroId: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cobros")
    .update({ status: "cancelado", canceled_at: new Date().toISOString() })
    .eq("id", cobroId)
    .eq("seller_id", sellerId)
    .in("status", ["pendiente", "vencido"])
    .select("*");
  if (error) throw new Error(error.message);
  const cobro = ((data as Cobro[] | null) ?? [])[0];
  if (!cobro) throw new CobroError("Este cobro ya no se puede cancelar.");

  // Melhor esforço: faz o link do Mercado Pago expirar.
  if (cobro.mp_preference_id) {
    try {
      const account = await getMpAccount(sellerId);
      if (account) {
        await expirePreference(await getValidAccessToken(account), cobro.mp_preference_id, toMxIsoWithOffset(new Date()));
      }
    } catch (e) {
      console.error("[cobros] no se pudo expirar la preferencia", e);
    }
  }
}
