import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { NewPasswordForm } from "@/components/auth-forms";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function NuevaContrasenaPage() {
  await requireUser();
  return (
    <AuthShell title="Crea tu nueva contraseña">
      <NewPasswordForm />
    </AuthShell>
  );
}
