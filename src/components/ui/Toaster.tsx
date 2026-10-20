"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastKind = "success" | "error";
interface ToastItem {
  id: number;
  text: string;
  kind: ToastKind;
}

const EVENT = "cobralo:toast";
let counter = 0;

export function toast(text: string, kind: ToastKind = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastItem>(EVENT, { detail: { id: ++counter, text, kind } }));
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const item = (e as CustomEvent<ToastItem>).detail;
      setItems((prev) => [...prev.slice(-2), item]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== item.id)), 3500);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))]" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex w-full max-w-md animate-toast-in items-center gap-3 rounded-2xl px-4 py-3.5 text-[16px] font-semibold shadow-lg",
            t.kind === "success" ? "bg-brand text-white" : "bg-red-600 text-white"
          )}
        >
          {t.kind === "success" ? <CheckCircle2 className="h-6 w-6 shrink-0" /> : <AlertCircle className="h-6 w-6 shrink-0" />}
          {t.text}
        </div>
      ))}
    </div>
  );
}
