import type { Metadata } from "next";
import { Alert, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth/session";
import { MAX_IMPORT_ROWS } from "@/lib/domain/import";
import { ImportWizard } from "./import-wizard";

export const metadata: Metadata = { title: "Importar planilha" };

export default async function ImportPage() {
  await requireContext();
  return (
    <>
      <PageHeader
        title="Importar planilha de clientes"
        description={`Arquivo CSV (exportado do Excel, Google Planilhas ou do sistema anterior), até ${MAX_IMPORT_ROWS} linhas por vez.`}
        back={{ href: "/clientes", label: "Clientes" }}
      />
      <div className="mb-6 space-y-3">
        <Alert tone="info" title="A importação não envia mensagens">
          Os contatos são apenas cadastrados. Nenhuma mensagem é preparada ou enviada automaticamente depois da importação.
        </Alert>
        <p className="text-sm text-slate-600">
          Não tem uma planilha? Baixe o{" "}
          <a href="/modelo-importacao.csv" download className="font-medium text-brand-700 underline">
            modelo de exemplo (dados fictícios)
          </a>
          .
        </p>
      </div>
      <ImportWizard />
    </>
  );
}
