import { ButtonLink, Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
      <Logo />
      <h1 className="mt-8 text-2xl font-bold">No encontramos esta página</h1>
      <p className="mt-2 text-slate-600">Revisa que el link esté completo. Si te lo mandaron por WhatsApp, cópialo de nuevo.</p>
      <ButtonLink href="/" className="mt-6">
        Ir al inicio
      </ButtonLink>
    </main>
  );
}
