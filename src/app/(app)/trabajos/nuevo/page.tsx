import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { JobForm } from "@/components/JobForm";
import { CLIENT_COLUMNS, getSupabase, requireAppProfile } from "@/lib/data";
import { todayInTz } from "@/lib/format";
import type { Client } from "@/lib/types";

export const metadata: Metadata = { title: "Nuevo trabajo" };

export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const { cliente } = await searchParams;
  const profile = await requireAppProfile();
  const supabase = await getSupabase();
  const { data } = await supabase.from("clients").select(CLIENT_COLUMNS).order("name");

  return (
    <>
      <PageHeader title="Nuevo trabajo" back={cliente ? `/clientes/${cliente}` : "/inicio"} />
      <JobForm
        clients={(data ?? []) as Client[]}
        initialClientId={cliente}
        serviceType={profile.service_type}
        today={todayInTz(profile.timezone)}
      />
    </>
  );
}
