/** Converte "R$ 1.234,56", "180", "180,5" ou "180.50" em centavos. */
export function parseBRLToCents(raw: string): number | null {
  let value = raw.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!value) return null;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(value)) {
    value = value.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+,\d{1,2}$/.test(value)) {
    value = value.replace(",", ".");
  } else if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    return null;
  }
  const cents = Math.round(Number(value) * 100);
  return Number.isFinite(cents) && cents >= 0 ? cents : null;
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}
