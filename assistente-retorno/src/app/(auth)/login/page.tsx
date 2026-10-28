import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, CardBody, Field, Input } from "@/components/ui";
import { getSession } from "@/lib/auth/session";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, SECOND_DEMO_ACCOUNT } from "@/lib/db/seed";
import { loginAction } from "../actions";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage() {
  if (await getSession()) redirect("/painel");
  const showDemo = process.env.SEED_DEMO !== "false";
  return (
    <>
      <Card>
        <CardBody className="space-y-4 py-6">
          <h1 className="text-xl font-semibold text-slate-900">Entrar</h1>
          <ActionForm action={loginAction} className="space-y-4" showSuccess={false}>
            <Field label="E-mail" htmlFor="email" required>
              <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={showDemo ? DEMO_ACCOUNTS[0].email : ""} />
            </Field>
            <Field label="Senha" htmlFor="password" required>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </Field>
            <SubmitButton className="w-full" pendingLabel="Entrando…">
              Entrar
            </SubmitButton>
          </ActionForm>
          <p className="text-center text-sm text-slate-600">
            Ainda não tem conta?{" "}
            <Link href="/cadastro" className="font-medium text-brand-700 hover:underline">
              Criar conta do salão
            </Link>
          </p>
        </CardBody>
      </Card>
      {showDemo && (
        <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
          <p className="font-semibold">Contas de demonstração (dados fictícios)</p>
          <ul className="mt-2 space-y-1">
            <li>
              <code>{DEMO_ACCOUNTS[0].email}</code> — proprietária do Salão Bela Vida
            </li>
            <li>
              <code>{DEMO_ACCOUNTS[1].email}</code> — recepção (acesso de equipe)
            </li>
            <li>
              <code>{SECOND_DEMO_ACCOUNT.email}</code> — outro salão (para verificar o isolamento)
            </li>
          </ul>
          <p className="mt-2">
            Senha de todas: <code>{DEMO_PASSWORD}</code>
          </p>
        </div>
      )}
    </>
  );
}
