export type Status = 'aguardando' | 'pago' | 'atrasado' | 'cancelado'

export interface Personal {
  id: string
  nome: string
  email: string
  whatsapp: string
  asaas_wallet_id: string | null
  teste_ate: string | null
}

export interface Aluno {
  id: string
  nome: string
  whatsapp: string
  cpf: string | null
  valor: number
  dia_vencimento: number
}

export interface Cobranca {
  id: string
  aluno_id: string
  valor: number
  vencimento: string
  status: Status
  link: string | null
  pago_em: string | null
}

export interface PagamentoApp {
  id: string
  valor: number
  vencimento: string
  status: Status
  link: string | null
}
