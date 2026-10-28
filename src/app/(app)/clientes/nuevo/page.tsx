import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { ClientForm } from "@/components/ClientForm";
import { requireAppProfile } from "@/lib/data";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default async function NewClientPage() {
  await requireAppProfile();
  return (
    <>
      <PageHeader title="Nuevo cliente" back="/clientes" />
      <ClientForm />
    </>
  );
}
