import Link from "next/link";
import { Clock } from "lucide-react";

export function TrialBanner({ days }: { days: number }) {
  const when = days <= 0 ? "hoy" : days === 1 ? "mañana" : `en ${days} días`;
  return (
    <Link
      href="/suscripcion"
      className="mt-3 flex items-center gap-3 rounded-2xl border border-alert/30 bg-alert-light px-4 py-3 text-alert-dark"
    >
      <Clock className="h-6 w-6 shrink-0" />
      <span className="text-[15px] font-semibold leading-snug">
        Tu prueba gratis termina {when}. <span className="underline">Suscríbete</span> para no perder acceso.
      </span>
    </Link>
  );
}
