"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Chips<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
  ariaLabel,
}: {
  options: { value: T; label: ReactNode }[];
  value: T | null | undefined;
  onChange: (v: T) => void;
  columns?: 2 | 3;
  ariaLabel?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("grid gap-2", columns === 3 ? "grid-cols-3" : "grid-cols-2")}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "min-h-[52px] rounded-xl border-2 px-3 text-[15px] font-semibold transition active:scale-[.98]",
              active ? "border-brand bg-brand-light text-brand" : "border-gray-200 bg-white text-ink hover:border-gray-300"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
