import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "./LoginForm";
import { safeNext } from "@/lib/redirect";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell
      title="Hola de nuevo"
      subtitle="Entra para ver quién te debe."
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="font-bold text-brand underline-offset-2 hover:underline">
            Empieza gratis
          </Link>
        </>
      }
    >
      <LoginForm next={safeNext(sp.next)} linkError={sp.error === "link"} />
    </AuthShell>
  );
}
