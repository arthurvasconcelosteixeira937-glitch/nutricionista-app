import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { SignupForm } from "./SignupForm";
import { TRIAL_DAYS } from "@/lib/constants";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle={`${TRIAL_DAYS} días gratis. Sin tarjeta.`}
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/entrar" className="font-bold text-brand underline-offset-2 hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
