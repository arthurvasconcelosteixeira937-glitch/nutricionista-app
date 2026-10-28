"use client";

import { cn } from "@/lib/cn";

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex min-h-[60px] w-full items-center justify-between gap-4 rounded-xl border-2 px-4 py-3 text-left transition",
        checked ? "border-brand bg-brand-50" : "border-gray-200 bg-white"
      )}
    >
      <span>
        <span className="block text-[16px] font-semibold text-ink">{label}</span>
        {description && <span className="block text-sm text-ink-muted">{description}</span>}
      </span>
      <span className={cn("relative h-8 w-14 shrink-0 rounded-full transition", checked ? "bg-brand" : "bg-gray-300")}>
        <span
          className={cn(
            "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all",
            checked ? "left-7" : "left-1"
          )}
        />
      </span>
    </button>
  );
}
