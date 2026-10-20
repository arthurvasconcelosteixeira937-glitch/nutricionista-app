import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { CobrarView } from "../CobrarView";
import { timesSentFor, toCobrarJobs } from "../load";
import { CLIENT_COLUMNS, JOB_COLUMNS, getSupabase, requireAppProfile } from "@/lib/data";
import { todayInTz } from "@/lib/format";
import type { Client, Job } from "@/lib/types";

export const metadata: Metadata = { title: "Cobrar" };

export default async function CobrarJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const profile = await requireAppProfile();
  const supabase = await getSupabase();

  const { data: jobData } = await supabase.from("jobs").select(JOB_COLUMNS).eq("id", jobId).maybeSingle();
  if (!jobData) notFound();
  const job = jobData as Job;
  if (job.is_paid) redirect(`/trabajos/${job.id}`);

  const [{ data: clientData }, timesSent] = await Promise.all([
    supabase.from("clients").select(CLIENT_COLUMNS).eq("id", job.client_id).single(),
    timesSentFor([job.id]),
  ]);
  const client = clientData as Client;

  return (
    <>
      <PageHeader title="Cobrar" back={`/trabajos/${job.id}`} />
      <CobrarView
        client={client}
        jobs={toCobrarJobs([job])}
        timesSent={timesSent}
        businessName={profile.business_name}
        payment={{ zelle: profile.zelle, venmo: profile.venmo, cashapp: profile.cashapp, accepts_cash: profile.accepts_cash }}
        today={todayInTz(profile.timezone)}
        backHref="/inicio"
      />
    </>
  );
}
