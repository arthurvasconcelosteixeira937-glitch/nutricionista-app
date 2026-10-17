import type { Metadata } from "next";
import Link from "next/link";
import { NewCobroForm } from "@/components/new-cobro-form";
import { Alert, Card } from "@/components/ui";
import { getSellerContext } from "@/lib/auth";
import { todayMxIso } from "@/lib/time";

export const metadata: Metadata = { title: "Nuevo cobro" };

export default async function NuevoCobroPage() {
  const ctx = await getSellerContext();
  return (
    <div className="space-y-4">
      <Link href="/panel" className="text-sm font-medium text-slate-500 hover:text-slate-800">
        ← Mis cobros
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Nuevo cobro</h1>
      {!ctx.access.canCreateCobros ? (
        <Alert kind="warning">
          {ctx.access.message}{" "}
          <Link href="/panel/ajustes#suscripcion" className="font-semibold underline">
            Ver cómo activar
          </Link>
        </Alert>
      ) : !ctx.mpConnected ? (
        <Alert kind="warning">
          Primero conecta tu cuenta de Mercado Pago.{" "}
          <a href="/api/mp/oauth/start?from=ajustes" className="font-semibold underline">Conectar</a>
        </Alert>
      ) : (
        <Card>
          <NewCobroForm today={todayMxIso()} />
        </Card>
      )}
    </div>
  );
}
