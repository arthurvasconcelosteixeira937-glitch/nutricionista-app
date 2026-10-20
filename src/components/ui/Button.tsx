import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "alert" | "danger" | "whatsapp";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition active:scale-[.98] disabled:opacity-60 disabled:pointer-events-none select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark shadow-sm",
  secondary: "bg-brand-light text-brand hover:bg-[#bfe9d2]",
  outline: "border-2 border-brand/20 bg-white text-brand hover:border-brand/40",
  ghost: "bg-transparent text-brand hover:bg-brand-50",
  alert: "bg-alert text-white hover:bg-alert-dark shadow-sm",
  danger: "border-2 border-red-200 bg-white text-red-700 hover:bg-red-50",
  whatsapp: "bg-[#1FA855] text-white hover:bg-[#178a45] shadow-sm",
};

const sizes: Record<Size, string> = {
  md: "min-h-[48px] px-4 text-base",
  lg: "min-h-[56px] px-5 text-lg",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  icon?: ReactNode;
}

export function buttonClass({ variant = "primary", size = "md", full }: CommonProps = {}) {
  return cn(base, variants[variant], sizes[size], full && "w-full");
}

export function Button({
  variant,
  size,
  full,
  icon,
  loading,
  children,
  className,
  disabled,
  type = "button",
  ...rest
}: CommonProps & ComponentProps<"button"> & { loading?: boolean }) {
  return (
    <button
      type={type}
      className={cn(buttonClass({ variant, size, full }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

export function LinkButton({
  variant,
  size,
  full,
  icon,
  children,
  className,
  ...rest
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(buttonClass({ variant, size, full }), className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
