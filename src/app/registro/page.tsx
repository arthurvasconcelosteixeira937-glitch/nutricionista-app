import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { SignUpForm } from "@/components/auth-forms";
import { getUser } from "@/lib/auth";
import { PLAN } from "@/lib/billing";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegistroPage() {
  if (await getUser()) redirect("/panel");
  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle={`${PLAN.trialDays} días gratis. Sin tarjeta para empezar.`}
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            Entra aquí
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
