import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-10 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-light text-brand">{icon}</div>
      <p className="text-lg font-bold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-xs text-[15px] text-ink-muted">{text}</p>}
      {action && <div className="mt-5 w-full max-w-xs">{action}</div>}
    </div>
  );
}
