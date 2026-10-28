"use client";

/** Marca/desmarca todas as caixas habilitadas com o name indicado dentro do formulário. */
export function SelectAllCheckbox({ formId, name, label = "Selecionar todas" }: { formId: string; name: string; label?: string }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        className="size-4 accent-brand-700"
        onChange={(e) => {
          const form = document.getElementById(formId);
          form?.querySelectorAll<HTMLInputElement>(`input[type=checkbox][name="${name}"]:not(:disabled)`).forEach((cb) => {
            cb.checked = e.target.checked;
          });
        }}
      />
      {label}
    </label>
  );
}
