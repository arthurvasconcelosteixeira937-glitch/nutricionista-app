import type { Metadata } from "next";
import { AuthShell } from "@/components/AuthShell";
import { NewPasswordForm } from "./NewPasswordForm";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function NewPasswordPage() {
  return (
    <AuthShell title="Crea una nueva contraseña" subtitle="Escríbela dos veces para confirmar.">
      <NewPasswordForm />
    </AuthShell>
  );
}
