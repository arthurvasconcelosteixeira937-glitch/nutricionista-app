import { daysBetween, fromCents, toCents } from "./format";
import type { Job, JobStatus } from "./types";

type JobLike = Pick<Job, "amount" | "amount_paid" | "is_paid" | "due_date">;

export function remaining(job: Pick<Job, "amount" | "amount_paid">): number {
  return fromCents(Math.max(0, toCents(job.amount) - toCents(job.amount_paid)));
}

export function jobStatus(job: JobLike, today: string): JobStatus {
  if (job.is_paid) return "pagado";
  return job.due_date < today ? "atrasado" : "pendiente";
}

export function daysOverdue(job: JobLike, today: string): number {
  if (job.is_paid) return 0;
  return Math.max(0, daysBetween(job.due_date, today));
}

export function isPartial(job: Pick<Job, "amount_paid" | "is_paid">): boolean {
  return !job.is_paid && Number(job.amount_paid) > 0;
}

export function sumRemaining(jobs: Pick<Job, "amount" | "amount_paid">[]): number {
  return fromCents(jobs.reduce((acc, j) => acc + Math.max(0, toCents(j.amount) - toCents(j.amount_paid)), 0));
}

export function sumAmounts(rows: { amount: number }[]): number {
  return fromCents(rows.reduce((acc, r) => acc + toCents(r.amount), 0));
}
