import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { JobForm } from "@/components/JobForm";
import { CLIENT_COLUMNS, JOB_COLUMNS, getSupabase, requireAppProfile } from "@/lib/data";
import { todayInTz } from "@/lib/format";
import type { Client, Job } from "@/lib/types";

export const metadata: Metadata = { title: "Editar trabajo" };

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireAppProfile();
  const supabase = await getSupabase();
  const [jobRes, clientsRes] = await Promise.all([
    supabase.from("jobs").select(JOB_COLUMNS).eq("id", id).maybeSingle(),
    supabase.from("clients").select(CLIENT_COLUMNS).order("name"),
  ]);
  if (!jobRes.data) notFound();

  return (
    <>
      <PageHeader title="Editar trabajo" back={`/trabajos/${id}`} />
      <JobForm
        job={jobRes.data as Job}
        clients={(clientsRes.data ?? []) as Client[]}
        serviceType={profile.service_type}
        today={todayInTz(profile.timezone)}
      />
    </>
  );
}
