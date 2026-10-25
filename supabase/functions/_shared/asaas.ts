// Chamadas à API do Asaas. As chaves ficam só nos segredos do Supabase.

const BASE_URL = (Deno.env.get('ASAAS_BASE_URL') ?? 'https://api-sandbox.asaas.com/v3').replace(/\/$/, '')

export const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') ?? ''
export const ASAAS_WALLET_ID = Deno.env.get('ASAAS_WALLET_ID') ?? ''

/** R$ 0,99 de cada mensalidade de aluno vai para a conta principal. */
export const SPLIT_PLATAFORMA = 0.99
/** Valor da assinatura do app paga pelo personal. */
export const VALOR_ASSINATURA_APP = 29.9
export const DIAS_TESTE_GRATIS = 7

export class AsaasErro extends Error {
  constructor(public status: number, public descricao: string | null) {
    super(descricao ?? `Asaas respondeu ${status}`)
  }
}

/**
 * Faz uma chamada ao Asaas.
 * @param apiKey chave da conta principal (padrão) ou da subconta do personal
 */
export async function asaas<T = any>(
  metodo: 'GET' | 'POST' | 'PUT' | 'DELETE',
  caminho: string,
  corpo?: unknown,
  apiKey: string = ASAAS_API_KEY,
): Promise<T> {
  const resp = await fetch(`${BASE_URL}${caminho}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'AlunoEmDia',
      access_token: apiKey,
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  })
  const texto = await resp.text()
  let dados: any = null
  try {
    dados = texto ? JSON.parse(texto) : null
  } catch {
    dados = null
  }
  if (!resp.ok) {
    const descricao = dados?.errors?.[0]?.description ?? null
    console.error(`Asaas ${metodo} ${caminho} -> ${resp.status}`, texto)
    throw new AsaasErro(resp.status, descricao)
  }
  return dados as T
}

/**
 * Monta uma mensagem simples para o usuário.
 * Quando o Asaas explica o problema (ex.: "CPF inválido"), mostramos junto.
 */
export function mensagemDeErro(e: unknown, padrao: string): string {
  if (e instanceof AsaasErro && e.status === 400 && e.descricao) {
    return `${padrao.replace(/,? tente de novo\.?$/, '.')} ${e.descricao}`
  }
  return padrao
}

/** Traduz o status do pagamento do Asaas para o status do painel. */
export function statusDoPainel(statusAsaas: string): 'aguardando' | 'pago' | 'atrasado' | 'cancelado' {
  switch (statusAsaas) {
    case 'RECEIVED':
    case 'CONFIRMED':
    case 'RECEIVED_IN_CASH':
      return 'pago'
    case 'OVERDUE':
      return 'atrasado'
    case 'REFUNDED':
    case 'REFUND_REQUESTED':
    case 'CHARGEBACK_REQUESTED':
    case 'DELETED':
      return 'cancelado'
    default:
      return 'aguardando'
  }
}

export function soNumeros(v: string | null | undefined): string {
  return (v ?? '').replace(/\D/g, '')
}

/** Data de hoje (fuso de Brasília) no formato AAAA-MM-DD. */
export function hojeBR(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

export function somarDias(dataISO: string, dias: number): string {
  const d = new Date(`${dataISO}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** Próxima data (hoje ou depois) que cai no dia do mês informado (1 a 28). */
export function proximoVencimento(dia: number): string {
  const [ano, mes, hoje] = hojeBR().split('-').map(Number)
  let a = ano
  let m = mes
  if (dia < hoje) {
    m += 1
    if (m > 12) {
      m = 1
      a += 1
    }
  }
  return `${a}-${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

/** Lista as cobranças de uma assinatura (até 100, mais recentes). */
export async function pagamentosDaAssinatura(assinaturaId: string, apiKey?: string): Promise<any[]> {
  const r = await asaas<{ data: any[] }>(
    'GET',
    `/payments?subscription=${encodeURIComponent(assinaturaId)}&limit=100`,
    undefined,
    apiKey,
  )
  return r?.data ?? []
}
