// Componentes visuais simples (sem dependências externas).
import Link from "next/link";
import { STATUS_LABEL } from "@/lib/cobro-status";
import type { CobroStatus } from "@/lib/types";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2 font-bold tracking-tight text-ink", className)}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#047857" />
        <path d="M16 6l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V9l8-3z" fill="#fff" />
        <path d="M12 16l3 3 5-6" stroke="#047857" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>
        Cobro<span className="text-brand-700">Seguro</span>
      </span>
    </span>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold transition focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60";
const variants = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 focus-visible:ring-brand-200 shadow-sm",
  secondary: "bg-white text-ink ring-1 ring-slate-300 hover:bg-slate-50 focus-visible:ring-slate-200",
  whatsapp: "bg-[#25D366] text-[#073b1f] hover:bg-[#1fbe5a] focus-visible:ring-green-200 shadow-sm",
  danger: "bg-white text-red-700 ring-1 ring-red-200 hover:bg-red-50 focus-visible:ring-red-100",
  ghost: "text-slate-700 hover:bg-slate-100",
};
export type ButtonVariant = keyof typeof variants;

export function buttonClass(variant: ButtonVariant = "primary", extra = "") {
  return cx(buttonBase, variants[variant], extra);
}

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
  external = false,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass(variant, className)}>
        {children}
      </a>
    );
  }
  // Rotas de API e sites externos (ex.: checkout do Mercado Pago) precisam de navegação completa.
  if (href.startsWith("/api/") || /^https?:\/\//.test(href)) {
    return (
      <a href={href} className={buttonClass(variant, className)}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cx("rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200", className)}>{children}</div>;
}

const statusStyle: Record<CobroStatus, string> = {
  pendiente: "bg-amber-50 text-amber-800 ring-amber-200",
  pagado: "bg-brand-50 text-brand-800 ring-brand-200",
  vencido: "bg-slate-100 text-slate-700 ring-slate-300",
  cancelado: "bg-slate-100 text-slate-500 ring-slate-200",
  reembolsado: "bg-red-50 text-red-700 ring-red-200",
};

export function StatusBadge({ status, className = "" }: { status: CobroStatus; className?: string }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1", statusStyle[status], className)}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Field({
  label,
  name,
  hint,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; hint?: string; error?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-800">{label}</span>
      <input
        name={name}
        aria-invalid={error ? true : undefined}
        className={cx(
          "block w-full rounded-xl border bg-white px-4 py-3 text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-4",
          error ? "border-red-400 focus:ring-red-100" : "border-slate-300 focus:border-brand-600 focus:ring-brand-100",
        )}
        {...props}
      />
      {error ? (
        <span className="mt-1 block text-sm text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-sm text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

export function Alert({ kind = "info", children }: { kind?: "info" | "error" | "success" | "warning"; children: React.ReactNode }) {
  const styles = {
    info: "bg-sky-50 text-sky-900 ring-sky-200",
    error: "bg-red-50 text-red-800 ring-red-200",
    success: "bg-brand-50 text-brand-900 ring-brand-200",
    warning: "bg-amber-50 text-amber-900 ring-amber-200",
  };
  return (
    <div role={kind === "error" ? "alert" : "status"} className={cx("rounded-xl px-4 py-3 text-sm ring-1", styles[kind])}>
      {children}
    </div>
  );
}

export function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4C2.7 15.6 2.2 13.8 2.2 12 2.2 6.6 6.6 2.2 12 2.2c2.6 0 5.1 1 6.9 2.9 1.8 1.8 2.9 4.3 2.9 6.9 0 5.4-4.4 9.8-9.8 9.8zm8.3-18.1C18.1 1.5 15.1.2 12 .2 5.5.2.2 5.5.2 12c0 2.1.5 4.1 1.6 5.9L.1 24l6.3-1.7c1.7.9 3.6 1.4 5.6 1.4 6.5 0 11.8-5.3 11.8-11.8 0-3.1-1.2-6.1-3.5-8.2z" />
    </svg>
  );
}
