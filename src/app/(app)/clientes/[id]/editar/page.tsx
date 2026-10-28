import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ClientForm } from "@/components/ClientForm";
import { DeleteClientButton } from "./DeleteClientButton";
import { CLIENT_COLUMNS, getSupabase, requireAppProfile } from "@/lib/data";
import type { Client } from "@/lib/types";

export const metadata: Metadata = { title: "Editar cliente" };

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAppProfile();
  const supabase = await getSupabase();
  const { data } = await supabase.from("clients").select(CLIENT_COLUMNS).eq("id", id).maybeSingle();
  if (!data) notFound();
  const client = data as Client;
  return (
    <>
      <PageHeader title="Editar cliente" back={`/clientes/${id}`} />
      <ClientForm client={client} />
      <div className="mt-8 border-t border-gray-200 pt-6">
        <DeleteClientButton clientId={client.id} name={client.name} />
      </div>
    </>
  );
}
