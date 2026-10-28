"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

export function ConfirmSheet({
  open,
  onClose,
  title,
  text,
  confirmLabel,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  text: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="text-[16px] text-ink-soft">{text}</div>
      <div className="mt-6 space-y-2">
        <Button full size="lg" className="!bg-red-600 !text-white hover:!bg-red-700" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
        <Button full variant="ghost" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
      </div>
    </Sheet>
  );
}
