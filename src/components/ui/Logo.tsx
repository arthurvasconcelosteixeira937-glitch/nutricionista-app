import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-9 w-9", className)} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#0F5132" />
      <path d="M41.5 22.5a13 13 0 1 0 0 19" fill="none" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" />
      <circle cx="44.5" cy="32" r="4.5" fill="#F97316" />
    </svg>
  );
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className={cn("text-2xl font-extrabold tracking-tight", light ? "text-white" : "text-brand")}>Cóbralo</span>
    </span>
  );
}
