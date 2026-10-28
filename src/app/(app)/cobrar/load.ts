import "server-only";
import type { CobrarJob } from "./CobrarView";
import { getSupabase } from "@/lib/data";
import { remaining } from "@/lib/jobs";
import type { Job } from "@/lib/types";

/** Cuántas veces se le cobró (el máximo entre los trabajos incluidos). */
export async function timesSentFor(jobIds: string[]): Promise<number> {
  if (jobIds.length === 0) return 0;
  const supabase = await getSupabase();
  const { data } = await supabase.from("reminders_sent").select("job_ids").overlaps("job_ids", jobIds);
  const counts = new Map<string, number>();
  for (const r of (data ?? []) as { job_ids: string[] }[]) {
    for (const id of r.job_ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return Math.max(0, ...jobIds.map((id) => counts.get(id) ?? 0));
}

export function toCobrarJobs(jobs: Job[]): CobrarJob[] {
  return jobs.map((j) => ({
    id: j.id,
    description: j.description,
    service_date: j.service_date,
    due_date: j.due_date,
    balance: remaining(j),
  }));
}
