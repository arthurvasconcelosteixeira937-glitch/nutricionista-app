import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { CobrarView } from "../../CobrarView";
import { timesSentFor, toCobrarJobs } from "../../load";
import { CLIENT_COLUMNS, JOB_COLUMNS, getSupabase, requireAppProfile } from "@/lib/data";
import { todayInTz } from "@/lib/format";
import type { Client, Job } from "@/lib/types";

export const metadata: Metadata = { title: "Cobrar todo" };

export default async function CobrarClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const profile = await requireAppProfile();
  const supabase = await getSupabase();

  const [clientRes, jobsRes] = await Promise.all([
    supabase.from("clients").select(CLIENT_COLUMNS).eq("id", clientId).maybeSingle(),
    supabase.from("jobs").select(JOB_COLUMNS).eq("client_id", clientId).eq("is_paid", false).order("due_date"),
  ]);
  if (!clientRes.data) notFound();
  const jobs = (jobsRes.data ?? []) as Job[];
  if (jobs.length === 0) redirect(`/clientes/${clientId}`);

  const timesSent = await timesSentFor(jobs.map((j) => j.id));

  return (
    <>
      <PageHeader title="Cobrar todo" back={`/clientes/${clientId}`} />
      <CobrarView
        client={clientRes.data as Client}
        jobs={toCobrarJobs(jobs)}
        timesSent={timesSent}
        businessName={profile.business_name}
        payment={{ zelle: profile.zelle, venmo: profile.venmo, cashapp: profile.cashapp, accepts_cash: profile.accepts_cash }}
        today={todayInTz(profile.timezone)}
        backHref={`/clientes/${clientId}`}
      />
    </>
  );
}
