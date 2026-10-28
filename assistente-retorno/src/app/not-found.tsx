import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-brand-700">Página não encontrada</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Não encontramos o que você procurava</h1>
      <p className="mt-2 text-sm text-slate-600">O endereço pode estar errado ou o registro não pertence à sua conta.</p>
      <LinkButton href="/painel" className="mt-6">Voltar ao painel</LinkButton>
    </main>
  );
}
