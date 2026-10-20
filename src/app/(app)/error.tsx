"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center px-4 pt-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-alert-light text-alert-dark">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h1 className="text-xl font-bold">Algo salió mal</h1>
      <p className="mt-2 text-ink-muted">Revisa tu conexión a internet e intenta de nuevo.</p>
      <Button className="mt-6" full icon={<RotateCw className="h-5 w-5" />} onClick={reset}>
        Intentar de nuevo
      </Button>
    </div>
  );
}
