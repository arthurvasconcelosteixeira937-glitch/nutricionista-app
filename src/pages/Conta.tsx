import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PagamentoApp, Personal } from '../lib/tipos'
import { diaMes, dinheiro, hoje } from '../lib/formato'

export default function Conta({ personal }: { personal: Personal }) {
  const [proximo, setProximo] = useState<PagamentoApp | null>(null)

  useEffect(() => {
    supabase
      .from('pagamentos_app')
      .select('id, valor, vencimento, status, link')
      .in('status', ['aguardando', 'atrasado'])
      .order('vencimento')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setProximo(data as PagamentoApp | null))
  }, [])

  const emTeste = personal.teste_ate && personal.teste_ate >= hoje()

  return (
    <>
      <h1 className="titulo">Minha conta</h1>

      <div className="cartao">
        <strong className="item-nome">{personal.nome}</strong>
        <span className="item-detalhe">{personal.email}</span>
      </div>

      <div className="cartao">
        <h2>Assinatura do app</h2>
        {emTeste && <p>🎁 Teste grátis até {diaMes(personal.teste_ate!)}.</p>}
        {proximo ? (
          <>
            <p>
              Próxima mensalidade: <strong>{dinheiro(Number(proximo.valor))}</strong> em {diaMes(proximo.vencimento)}
            </p>
            {proximo.link && (
              <a className="botao botao-secundario" href={proximo.link} target="_blank" rel="noreferrer">
                Pagar assinatura
              </a>
            )}
          </>
        ) : (
          <p>Sua assinatura está em dia. ✅</p>
        )}
      </div>

      <button className="botao botao-link" onClick={() => supabase.auth.signOut()}>
        Sair da conta
      </button>
    </>
  )
}
