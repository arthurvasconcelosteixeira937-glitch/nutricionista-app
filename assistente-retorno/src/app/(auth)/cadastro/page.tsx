import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, CardBody, Checkbox, Field, Input } from "@/components/ui";
import { signupAction } from "../actions";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignupPage() {
  return (
    <Card>
      <CardBody className="space-y-4 py-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Criar conta do salão</h1>
          <p className="mt-1 text-sm text-slate-600">Sem cobrança nesta fase de testes.</p>
        </div>
        <ActionForm action={signupAction} className="space-y-4" showSuccess={false}>
          <Field label="Nome do salão" htmlFor="salonName" required>
            <Input id="salonName" name="salonName" required maxLength={80} />
          </Field>
          <Field label="Seu nome" htmlFor="userName" required>
            <Input id="userName" name="userName" required maxLength={80} autoComplete="name" />
          </Field>
          <Field label="E-mail" htmlFor="email" required>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </Field>
          <Field label="Senha" htmlFor="password" required hint="Mínimo de 8 caracteres.">
            <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
          </Field>
          <Checkbox
            name="acceptTerms"
            required
            label="Entendo que este é um protótipo de validação e que não devo cadastrar dados reais de clientes."
          />
          <SubmitButton className="w-full" pendingLabel="Criando conta…">
            Criar conta
          </SubmitButton>
        </ActionForm>
        <p className="text-center text-sm text-slate-600">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-brand-700 hover:underline">
            Entrar
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
