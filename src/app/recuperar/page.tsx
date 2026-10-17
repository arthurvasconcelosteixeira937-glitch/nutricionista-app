import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ResetForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <AuthShell
      title="¿Olvidaste tu contraseña?"
      subtitle="Te mandamos un enlace a tu correo para crear una nueva."
      footer={
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Volver a entrar
        </Link>
      }
    >
      <ResetForm />
    </AuthShell>
  );
}
