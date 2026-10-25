import { useState, type FormEvent } from 'react'
import { chamarFuncao, supabase } from '../lib/supabase'
import { lerDinheiro, mascaraCep, mascaraCpfCnpj, mascaraTelefone, soNumeros } from '../lib/formato'
import Aviso from '../components/Aviso'

const TIPOS_EMPRESA = [
  { valor: 'MEI', texto: 'MEI' },
  { valor: 'LIMITED', texto: 'Limitada (LTDA)' },
  { valor: 'INDIVIDUAL', texto: 'Empresário individual' },
  { valor: 'ASSOCIATION', texto: 'Associação' },
]

export default function CompletarCadastro({ email, aoConcluir }: { email: string; aoConcluir: () => void }) {
  const [f, setF] = useState({
    nome: '',
    whatsapp: '',
    cpfCnpj: '',
    tipoEmpresa: '',
    nascimento: '',
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    renda: '',
  })
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const ehCnpj = soNumeros(f.cpfCnpj).length > 11
  const mudar = (campo: keyof typeof f) => (valor: string) => setF((atual) => ({ ...atual, [campo]: valor }))

  // Preenche o endereço sozinho a partir do CEP
  async function buscarCep(cep: string) {
    const n = soNumeros(cep)
    if (n.length !== 8) return
    try {
      const r = await fetch(`https://viacep.com.br/ws/${n}/json/`)
      const d = await r.json()
      if (d.erro) return
      setF((atual) => ({
        ...atual,
        endereco: atual.endereco || d.logradouro || '',
        bairro: atual.bairro || d.bairro || '',
      }))
    } catch {
      // sem problema: a pessoa digita o endereço
    }
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await chamarFuncao('criar-subconta', {
        nome: f.nome,
        whatsapp: f.whatsapp,
        cpfCnpj: f.cpfCnpj,
        tipoEmpresa: ehCnpj ? f.tipoEmpresa : null,
        nascimento: f.nascimento || null,
        cep: f.cep,
        endereco: f.endereco,
        numero: f.numero,
        bairro: f.bairro,
        rendaMensal: lerDinheiro(f.renda),
      })
      aoConcluir()
    } catch (e) {
      setErro((e as Error).message)
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="tela-entrada">
      <form className="cartao" onSubmit={enviar}>
        <h2>Seus dados</h2>
        <p className="passo">Passo 2 de 2 — para você receber dos seus alunos</p>
        <p className="dica">Entrando como {email}</p>

        <label>
          Nome completo
          <input required autoComplete="name" value={f.nome} onChange={(e) => mudar('nome')(e.target.value)} />
        </label>
        <label>
          WhatsApp
          <input
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(11) 91234-5678"
            value={f.whatsapp}
            onChange={(e) => mudar('whatsapp')(mascaraTelefone(e.target.value))}
          />
        </label>
        <label>
          CPF ou CNPJ
          <input
            required
            inputMode="numeric"
            value={f.cpfCnpj}
            onChange={(e) => mudar('cpfCnpj')(mascaraCpfCnpj(e.target.value))}
          />
        </label>
        {ehCnpj && (
          <label>
            Tipo de empresa
            <select required value={f.tipoEmpresa} onChange={(e) => mudar('tipoEmpresa')(e.target.value)}>
              <option value="">Escolha...</option>
              {TIPOS_EMPRESA.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.texto}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Data de nascimento
          <input
            type="date"
            required={!ehCnpj}
            autoComplete="bday"
            value={f.nascimento}
            onChange={(e) => mudar('nascimento')(e.target.value)}
          />
        </label>
        <label>
          CEP
          <input
            required
            inputMode="numeric"
            autoComplete="postal-code"
            value={f.cep}
            onChange={(e) => {
              const v = mascaraCep(e.target.value)
              mudar('cep')(v)
              buscarCep(v)
            }}
          />
        </label>
        <label>
          Endereço (rua)
          <input required value={f.endereco} onChange={(e) => mudar('endereco')(e.target.value)} />
        </label>
        <div className="linha">
          <label className="estreito">
            Número
            <input required value={f.numero} onChange={(e) => mudar('numero')(e.target.value)} />
          </label>
          <label>
            Bairro
            <input required value={f.bairro} onChange={(e) => mudar('bairro')(e.target.value)} />
          </label>
        </div>
        <label>
          Renda mensal aproximada (R$)
          <input
            required
            inputMode="decimal"
            placeholder="Ex.: 5.000"
            value={f.renda}
            onChange={(e) => mudar('renda')(e.target.value)}
          />
        </label>

        <p className="dica">
          Esses dados são pedidos pelo banco que processa os pagamentos (Asaas) para abrir sua conta de
          recebimentos. Você tem 7 dias grátis; depois, R$ 29,90 por mês.
        </p>

        <Aviso texto={erro} />

        <button className="botao botao-principal" disabled={enviando}>
          {enviando ? 'Criando sua conta...' : 'Concluir cadastro'}
        </button>
        <button type="button" className="botao botao-link" onClick={() => supabase.auth.signOut()}>
          Sair
        </button>
      </form>
    </div>
  )
}
