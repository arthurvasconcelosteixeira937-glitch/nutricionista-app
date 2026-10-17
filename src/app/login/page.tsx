import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/auth-forms";
import { Alert } from "@/components/ui";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  if (await getUser()) redirect("/panel");
  return (
    <AuthShell
      title="Entra a tu cuenta"
      subtitle="Qué gusto verte de nuevo."
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="font-semibold text-brand-700 hover:underline">
            Empieza gratis
          </Link>
        </>
      }
    >
      {error === "enlace_invalido" ? (
        <div className="mb-4">
          <Alert kind="warning">El enlace ya no es válido o expiró. Pide uno nuevo.</Alert>
        </div>
      ) : null}
      <LoginForm next={next} />
    </AuthShell>
  );
}
