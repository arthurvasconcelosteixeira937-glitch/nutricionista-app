import { cn } from "@/lib/cn";
import type { JobStatus } from "@/lib/types";

export function StatusBadge({
  status,
  daysLate,
  daysToDue,
  className,
}: {
  status: JobStatus;
  daysLate?: number;
  daysToDue?: number;
  className?: string;
}) {
  let text: string;
  let style: string;
  if (status === "pagado") {
    text = "Pagado";
    style = "bg-brand-light text-brand";
  } else if (status === "atrasado") {
    text = daysLate ? `${daysLate} ${daysLate === 1 ? "día" : "días"} de atraso` : "Atrasado";
    style = "bg-alert-light text-alert-dark";
  } else {
    text = daysToDue === 0 ? "Vence hoy" : daysToDue && daysToDue > 0 ? `Vence en ${daysToDue} ${daysToDue === 1 ? "día" : "días"}` : "Pendiente";
    style = daysToDue === 0 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-ink-soft";
  }
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-semibold", style, className)}>
      {text}
    </span>
  );
}
