"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_RE = /^[0-9a-f-]{36}$/i;

/** Ativa (ou estende) por 30 dias a partir de hoje ou do fim do período atual. */
export async function activateSellerAction(formData: FormData) {
  await requireAdmin();
  const sellerId = String(formData.get("seller_id") ?? "");
  if (!UUID_RE.test(sellerId)) return;
  const admin = createAdminClient();
  const { data: sub } = await admin.from("subscriptions").select("status, current_period_end").eq("seller_id", sellerId).single();
  const now = Date.now();
  const currentEnd = sub?.status === "active" && sub.current_period_end ? new Date(sub.current_period_end).getTime() : 0;
  const base = Math.max(now, currentEnd);
  await admin
    .from("subscriptions")
    .update({ status: "active", provider: "manual", current_period_end: new Date(base + 30 * 86_400_000).toISOString() })
    .eq("seller_id", sellerId);
  revalidatePath("/admin");
}

export async function deactivateSellerAction(formData: FormData) {
  await requireAdmin();
  const sellerId = String(formData.get("seller_id") ?? "");
  if (!UUID_RE.test(sellerId)) return;
  await createAdminClient().from("subscriptions").update({ status: "inactive" }).eq("seller_id", sellerId);
  revalidatePath("/admin");
}
