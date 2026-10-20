// Esqueleto de carga para las secciones de la app.
// Nota: no se usa en /historial: un loading.tsx ahí hace que la navegación
// solo con search params (?filtro=) se quede colgada en producción (Next 15).
export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4 pt-6" aria-label="Cargando" role="status">
      <div className="h-8 w-40 rounded-lg bg-gray-200" />
      <div className="h-28 rounded-2xl bg-gray-200" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 rounded-2xl bg-gray-200" />
        <div className="h-24 rounded-2xl bg-gray-200" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 rounded-2xl bg-gray-200" />
      ))}
    </div>
  );
}
