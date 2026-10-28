export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-brand-700 text-lg font-semibold text-white">
            AR
          </div>
          <p className="text-lg font-semibold text-slate-900">Assistente de Retorno</p>
          <p className="text-sm text-slate-600">Recupere clientes e organize o relacionamento do seu salão.</p>
        </div>
        {children}
        <p className="mt-6 text-center text-xs text-slate-500">
          Protótipo para validação. Não utilize dados reais de clientes nesta versão.
        </p>
      </div>
    </main>
  );
}
