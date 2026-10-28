export default function Loading() {
  return (
    <div role="status" aria-label="Carregando" className="animate-pulse space-y-4">
      <div className="h-8 w-56 rounded bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-200" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-slate-200" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
