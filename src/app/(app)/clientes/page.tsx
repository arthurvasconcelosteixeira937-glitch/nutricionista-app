import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ClientList, type ClientListItem } from "./ClientList";
import { CLIENT_COLUMNS, getSupabase, requireAppProfile } from "@/lib/data";
import { todayInTz, toCents, fromCents } from "@/lib/format";
import type { Client, Job } from "@/lib/types";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientsPage() {
  const profile = await requireAppProfile();
  const today = todayInTz(profile.timezone);
  const supabase = await getSupabase();

  const [clientsRes, jobsRes] = await Promise.all([
    supabase.from("clients").select(CLIENT_COLUMNS).order("name"),
    supabase.from("jobs").select("client_id, amount, amount_paid, due_date").eq("is_paid", false),
  ]);
  if (clientsRes.error) throw clientsRes.error;

  const owed = new Map<string, { cents: number; late: boolean }>();
  for (const j of (jobsRes.data ?? []) as Pick<Job, "client_id" | "amount" | "amount_paid" | "due_date">[]) {
    const cur = owed.get(j.client_id) ?? { cents: 0, late: false };
    cur.cents += toCents(j.amount) - toCents(j.amount_paid);
    cur.late ||= j.due_date < today;
    owed.set(j.client_id, cur);
  }

  const items: ClientListItem[] = ((clientsRes.data ?? []) as Client[]).map((c) => ({
    ...c,
    owed: fromCents(owed.get(c.id)?.cents ?? 0),
    late: owed.get(c.id)?.late ?? false,
  }));

  return (
    <>
      <PageHeader
        title="Clientes"
        action={
          <LinkButton href="/clientes/nuevo" variant="secondary" className="!min-h-[44px] !px-3" icon={<UserPlus className="h-5 w-5" />}>
            Nuevo
          </LinkButton>
        }
      />
      <ClientList clients={items} />
    </>
  );
}
