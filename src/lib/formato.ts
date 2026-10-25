const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

export function dinheiro(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** "150,50" ou "1.234,00" -> número */
export function lerDinheiro(texto: string): number {
  const limpo = texto.replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.')
  return Number(limpo)
}

export function soNumeros(v: string): string {
  return v.replace(/\D/g, '')
}

/** Data de hoje (fuso de Brasília) como AAAA-MM-DD */
export function hoje(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

export function mesAtual(): string {
  return hoje().slice(0, 7)
}

/** "2026-11-10" -> "novembro" */
export function nomeDoMes(dataISO: string): string {
  return MESES[Number(dataISO.slice(5, 7)) - 1]
}

/** "2026-11-10" -> "10/11" */
export function diaMes(dataISO: string): string {
  return `${dataISO.slice(8, 10)}/${dataISO.slice(5, 7)}`
}

export function mascaraTelefone(v: string): string {
  const n = soNumeros(v).slice(0, 11)
  if (n.length <= 2) return n
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
}

export function mascaraCpfCnpj(v: string): string {
  const n = soNumeros(v).slice(0, 14)
  if (n.length <= 11) {
    return n
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return n
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

export function mascaraCep(v: string): string {
  const n = soNumeros(v).slice(0, 8)
  return n.length > 5 ? `${n.slice(0, 5)}-${n.slice(5)}` : n
}

/** Link do WhatsApp com a mensagem de cobrança pronta */
export function linkCobrancaWhatsApp(nome: string, whatsapp: string, vencimento: string, link: string): string {
  let numero = soNumeros(whatsapp)
  if (!numero.startsWith('55') || numero.length <= 11) numero = `55${numero}`
  const primeiroNome = nome.trim().split(/\s+/)[0]
  const texto =
    `Oi ${primeiroNome}! Segue o link da sua mensalidade de ${nomeDoMes(vencimento)}: ${link}. ` +
    `Qualquer dúvida, me chama 💪`
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
}
