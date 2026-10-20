import { SearchX } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-light text-brand">
        <SearchX className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold">No encontramos esta página</h1>
      <p className="mt-2 text-ink-muted">Puede que se haya borrado o que el enlace esté mal.</p>
      <LinkButton href="/inicio" className="mt-6" full>
        Ir al inicio
      </LinkButton>
    </main>
  );
}
