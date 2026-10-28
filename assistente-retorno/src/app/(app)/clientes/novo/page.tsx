import type { Metadata } from "next";
import { ClientForm } from "@/components/client-form";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth/session";
import { listServices } from "@/lib/repos/services";
import { createClientAction } from "../actions";

export const metadata: Metadata = { title: "Nova cliente" };

export default async function NewClientPage() {
  const ctx = await requireContext();
  return (
    <>
      <PageHeader title="Nova cliente" back={{ href: "/clientes", label: "Clientes" }} />
      <Card className="max-w-3xl">
        <CardBody className="py-6">
          <ClientForm action={createClientAction} services={listServices(ctx)} submitLabel="Cadastrar cliente" />
        </CardBody>
      </Card>
    </>
  );
}
