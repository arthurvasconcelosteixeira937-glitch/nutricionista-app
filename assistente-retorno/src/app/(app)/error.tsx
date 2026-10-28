"use client";

import { Alert, Button } from "@/components/ui";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-10">
      <Alert tone="danger" title="Não foi possível carregar esta página">
        Ocorreu um erro inesperado. Seus dados não foram alterados. Tente novamente; se continuar, recarregue a página.
      </Alert>
      <Button className="mt-4" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  );
}
