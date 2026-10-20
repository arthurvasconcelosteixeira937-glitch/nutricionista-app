import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: "Olvidé mi contraseña" };

export default function ForgotPage() {
  return (
    <AuthShell
      title="¿Olvidaste tu contraseña?"
      subtitle="Escribe tu correo y te enviamos un enlace para crear una nueva."
      footer={
        <Link href="/entrar" className="font-bold text-brand">
          Volver a entrar
        </Link>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}
