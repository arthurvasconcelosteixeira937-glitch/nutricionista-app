import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Aluno, Cobranca } from '../lib/tipos'
import { diaMes, dinheiro, linkCobrancaWhatsApp, mesAtual, nomeDoMes, hoje } from '../lib/formato'
import { cobrancaDoMomento, TEXTO_STATUS } from '../lib/situacao'
import Aviso from '../components/Aviso'
import Carregando from '../components/Carregando'

export default function Painel() {
  const [alunos, setAlunos] = useState<Aluno[] | null>(null)
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([])
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    // Últimos 6 meses bastam para o painel
    const desde = new Date()
    desde.setMonth(desde.getMonth() - 6)
    const [ra, rc] = await Promise.all([
      supabase.from('alunos').select('id, nome, whatsapp, cpf, valor, dia_vencimento').order('nome'),
      supabase
        .from('cobrancas')
        .select('id, aluno_id, valor, vencimento, status, link, pago_em')
        .gte('vencimento', desde.toISOString().slice(0, 10)),
    ])
    if (ra.error || rc.error) {
      setErro('Não conseguimos carregar seus alunos. Puxe a tela para baixo ou tente de novo.')
      setAlunos((a) => a ?? [])
      return
    }
    setErro(null)
    setAlunos(ra.data.map((a) => ({ ...a, valor: Number(a.valor) })) as Aluno[])
    setCobrancas(rc.data.map((c) => ({ ...c, valor: Number(c.valor) })) as Cobranca[])
  }, [])

  useEffect(() => {
    carregar()
    // Atualiza sozinho quando o Asaas avisa um pagamento
    const canal = supabase
      .channel('painel-cobrancas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cobrancas' }, () => carregar())
      .subscribe()
    const aoVoltar = () => document.visibilityState === 'visible' && carregar()
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      supabase.removeChannel(canal)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [carregar])

  const totais = useMemo(() => {
    const mes = mesAtual()
    let aReceber = 0
    let recebido = 0
    let atrasado = 0
    for (const c of cobrancas) {
      if (c.status === 'aguardando' && c.vencimento.startsWith(mes)) aReceber += c.valor
      if (c.status === 'pago' && (c.pago_em ?? c.vencimento).startsWith(mes)) recebido += c.valor
      if (c.status === 'atrasado') atrasado += c.valor
    }
    return { aReceber, recebido, atrasado }
  }, [cobrancas])

  const linhas = useMemo(() => {
    if (!alunos) return []
    const ordem = { atrasado: 0, aguardando: 1, sem: 2, pago: 3, cancelado: 4 }
    return alunos
      .map((aluno) => ({ aluno, cobranca: cobrancaDoMomento(cobrancas.filter((c) => c.aluno_id === aluno.id)) }))
      .sort((a, b) => ordem[a.cobranca?.status ?? 'sem'] - ordem[b.cobranca?.status ?? 'sem'])
  }, [alunos, cobrancas])

  if (!alunos) return <Carregando />

  const nomeMes = nomeDoMes(hoje())

  return (
    <>
      <h1 className="titulo">Painel</h1>

      <section className="numeros">
        <div className="numero numero-receber">
          <span>A receber em {nomeMes}</span>
          <strong>{dinheiro(totais.aReceber)}</strong>
        </div>
        <div className="numero numero-recebido">
          <span>Recebido</span>
          <strong>{dinheiro(totais.recebido)}</strong>
        </div>
        <div className="numero numero-atrasado">
          <span>Atrasado</span>
          <strong>{dinheiro(totais.atrasado)}</strong>
        </div>
      </section>

      <Aviso texto={erro} />

      {alunos.length === 0 ? (
        <div className="vazio">
          <p>Você ainda não tem alunos cadastrados.</p>
          <Link className="botao botao-principal" to="/alunos">
            Adicionar meu primeiro aluno
          </Link>
        </div>
      ) : (
        <ul className="lista">
          {linhas.map(({ aluno, cobranca }) => (
            <li key={aluno.id} className={`item status-${cobranca?.status ?? 'sem'}`}>
              <div className="item-topo">
                <div>
                  <strong className="item-nome">{aluno.nome}</strong>
                  <span className="item-detalhe">
                    {dinheiro(cobranca?.valor ?? aluno.valor)}
                    {cobranca ? ` · vence ${diaMes(cobranca.vencimento)}` : ''}
                  </span>
                </div>
                <span className={`selo selo-${cobranca?.status ?? 'sem'}`}>
                  {cobranca ? TEXTO_STATUS[cobranca.status] : 'Sem cobrança'}
                </span>
              </div>
              {cobranca && cobranca.status !== 'pago' && cobranca.link && (
                <a
                  className="botao botao-whatsapp"
                  href={linkCobrancaWhatsApp(aluno.nome, aluno.whatsapp, cobranca.vencimento, cobranca.link)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Cobrar no WhatsApp
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
