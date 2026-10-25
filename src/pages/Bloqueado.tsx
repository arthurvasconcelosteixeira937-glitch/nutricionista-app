import { useEffect, useState } from 'react'
import { chamarFuncao, supabase } from '../lib/supabase'
import type { PagamentoApp } from '../lib/tipos'
import { diaMes, dinheiro } from '../lib/formato'
import Aviso from '../components/Aviso'

export default function Bloqueado({ aoLiberar }: { aoLiberar: () => void }) {
  const [pagamento, setPagamento] = useState<PagamentoApp | null>(null)
  const [verificando, setVerificando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('pagamentos_app')
      .select('id, valor, vencimento, status, link')
      .in('status', ['aguardando', 'atrasado'])
      .order('vencimento')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setPagamento(data as PagamentoApp | null))
  }, [])

  async function jaPaguei() {
    setAviso(null)
    setVerificando(true)
    try {
      const r = await chamarFuncao<{ bloqueado: boolean }>('sincronizar-assinatura')
      if (r.bloqueado) {
        setAviso('Ainda não recebemos seu pagamento. Pix cai na hora; boleto pode levar até 3 dias úteis.')
      } else {
        aoLiberar()
      }
    } catch (e) {
      setAviso((e as Error).message)
    } finally {
      setVerificando(false)
    }
  }

  return (
    <div className="tela-entrada">
      <div className="cartao centro">
        <div className="icone-grande">🔒</div>
        <h2>Renove sua assinatura</h2>
        <p>
          Sua assinatura do Aluno em Dia está atrasada há mais de 5 dias. Pague para voltar a usar o app.
          Seus alunos e cobranças continuam guardados.
        </p>
        {pagamento && (
          <p>
            <strong>{dinheiro(Number(pagamento.valor))}</strong> · venceu em {diaMes(pagamento.vencimento)}
          </p>
        )}
        {pagamento?.link && (
          <a className="botao botao-principal" href={pagamento.link} target="_blank" rel="noreferrer">
            Pagar agora
          </a>
        )}
        <button className="botao botao-secundario" onClick={jaPaguei} disabled={verificando}>
          {verificando ? 'Verificando...' : 'Já paguei'}
        </button>
        <Aviso texto={aviso} />
        <button className="botao botao-link" onClick={() => supabase.auth.signOut()}>
          Sair
        </button>
      </div>
    </div>
  )
}
