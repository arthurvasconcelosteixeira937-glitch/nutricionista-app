/**
 * Verificações aplicadas a toda mensagem (gerada ou editada) antes da aprovação.
 * Elas não bloqueiam: sinalizam para a pessoa revisora termos que podem indicar
 * promessas não registradas (descontos, preços, disponibilidade, urgência).
 */
const RISKY_TERMS: { re: RegExp; label: string }[] = [
  { re: /desconto/i, label: "desconto" },
  { re: /promo[cç][aã]o|promocional/i, label: "promoção" },
  { re: /gr[aá]tis|gratuit/i, label: "gratuidade" },
  { re: /\d+\s?%/, label: "percentual" },
  { re: /R\$\s?\d/i, label: "preço" },
  { re: /cupom/i, label: "cupom" },
  { re: /brinde/i, label: "brinde" },
  { re: /\boferta/i, label: "oferta" },
  { re: /\bvagas?\b|hor[aá]rios?\s+(dispon[ií]ve(l|is)|livres?)/i, label: "disponibilidade de horários" },
  { re: /\b(hoje|amanh[ãa])\b/i, label: "data específica" },
  { re: /[uú]ltim[ao]s?\s+(dias|vagas|chance|oportunidade)/i, label: "urgência" },
];

export const MAX_MESSAGE_LENGTH = 700;

export function checkMessage(text: string, extraFacts: string | null): string[] {
  const warnings: string[] = [];
  const facts = extraFacts ?? "";
  for (const { re, label } of RISKY_TERMS) {
    if (re.test(text) && !re.test(facts)) {
      warnings.push(
        `Menciona ${label}, que não está nas informações da campanha. Confira antes de aprovar.`,
      );
    }
  }
  if (/\{|\}|\[nome|\[sal[aã]o/i.test(text)) warnings.push("Parece conter um campo não preenchido.");
  if (text.length > MAX_MESSAGE_LENGTH) warnings.push(`Mensagem longa (${text.length} caracteres).`);
  return warnings;
}
