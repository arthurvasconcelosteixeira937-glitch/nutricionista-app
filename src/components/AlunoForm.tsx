import { useState, type FormEvent } from 'react'
import { chamarFuncao } from '../lib/supabase'
import type { Aluno } from '../lib/tipos'
import { lerDinheiro, mascaraCpfCnpj, mascaraTelefone } from '../lib/formato'
import Aviso from './Aviso'

const DIAS = Array.from({ length: 28 }, (_, i) => i + 1)

export default function AlunoForm({ aluno, aoFechar }: { aluno: Aluno | null; aoFechar: (mudou: boolean) => void }) {
  const [nome, setNome] = useState(aluno?.nome ?? '')
  const [whatsapp, setWhatsapp] = useState(mascaraTelefone(aluno?.whatsapp ?? ''))
  const [cpf, setCpf] = useState(mascaraCpfCnpj(aluno?.cpf ?? ''))
  const [valor, setValor] = useState(aluno ? aluno.valor.toFixed(2).replace('.', ',') : '')
  const [dia, setDia] = useState(String(aluno?.dia_vencimento ?? 10))
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmarRemocao, setConfirmarRemocao] = useState(false)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setOcupado(true)
    try {
      await chamarFuncao('salvar-aluno', {
        id: aluno?.id,
        nome,
        whatsapp,
        cpf,
        valor: lerDinheiro(valor),
        diaVencimento: Number(dia),
      })
      aoFechar(true)
    } catch (e) {
      setErro((e as Error).message)
      setOcupado(false)
    }
  }

  async function remover() {
    if (!aluno) return
    setErro(null)
    setOcupado(true)
    try {
      await chamarFuncao('remover-aluno', { id: aluno.id })
      aoFechar(true)
    } catch (e) {
      setErro((e as Error).message)
      setOcupado(false)
    }
  }

  return (
    <>
      <button className="voltar" onClick={() => aoFechar(false)}>
        ‹ Voltar
      </button>
      <form className="cartao" onSubmit={salvar}>
        <h2>{aluno ? 'Editar aluno' : 'Novo aluno'}</h2>

        <label>
          Nome
          <input required value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label>
          WhatsApp
          <input
            required
            type="tel"
            inputMode="tel"
            placeholder="(11) 91234-5678"
            value={whatsapp}
            onChange={(e) => setWhatsapp(mascaraTelefone(e.target.value))}
          />
        </label>
        <label>
          <span>CPF <small>(opcional)</small></span>
          <input inputMode="numeric" value={cpf} onChange={(e) => setCpf(mascaraCpfCnpj(e.target.value).slice(0, 14))} />
        </label>
        <div className="linha">
          <label>
            Mensalidade (R$)
            <input
              required
              inputMode="decimal"
              placeholder="150,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </label>
          <label className="estreito">
            Vence dia
            <select value={dia} onChange={(e) => setDia(e.target.value)}>
              {DIAS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!aluno && (
          <p className="dica">
            Ao salvar, criamos a cobrança mensal. O aluno escolhe pagar por Pix, boleto ou cartão.
          </p>
        )}

        <Aviso texto={erro} />

        <button className="botao botao-principal" disabled={ocupado}>
          {ocupado ? 'Salvando...' : 'Salvar'}
        </button>

        {aluno &&
          (confirmarRemocao ? (
            <div className="confirmar">
              <p>Remover {aluno.nome}? As cobranças em aberto deste aluno serão canceladas.</p>
              <button type="button" className="botao botao-perigo" disabled={ocupado} onClick={remover}>
                Sim, remover
              </button>
              <button type="button" className="botao botao-link" onClick={() => setConfirmarRemocao(false)}>
                Não, voltar
              </button>
            </div>
          ) : (
            <button type="button" className="botao botao-link perigo" onClick={() => setConfirmarRemocao(true)}>
              Remover aluno
            </button>
          ))}
      </form>
    </>
  )
}
