import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const inputClass =
  "block w-full min-h-[52px] rounded-xl border-2 border-gray-200 bg-white px-4 text-[17px] text-ink placeholder:text-gray-400 transition focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:bg-gray-50";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  optional,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[15px] font-semibold text-ink">
        {label}
        {optional && <span className="ml-1 font-normal text-ink-muted">(opcional)</span>}
      </label>
      {children}
      {error ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ invalid, className, ...rest }: ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <input
      className={cn(inputClass, invalid && "border-red-400 focus:border-red-500 focus:ring-red-100", className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}

export function TextArea({ invalid, className, ...rest }: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(inputClass, "py-3 leading-relaxed", invalid && "border-red-400", className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}

export function MoneyInput({ invalid, className, ...rest }: ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-ink-muted">
        $
      </span>
      <input
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        className={cn(inputClass, "pl-9 text-xl font-semibold", invalid && "border-red-400", className)}
        aria-invalid={invalid || undefined}
        {...rest}
      />
    </div>
  );
}
