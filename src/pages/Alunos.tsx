import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Aluno } from '../lib/tipos'
import { dinheiro } from '../lib/formato'
import AlunoForm from '../components/AlunoForm'
import Aviso from '../components/Aviso'
import Carregando from '../components/Carregando'

export default function Alunos() {
  const [alunos, setAlunos] = useState<Aluno[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [editando, setEditando] = useState<Aluno | 'novo' | null>(null)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('alunos')
      .select('id, nome, whatsapp, cpf, valor, dia_vencimento')
      .order('nome')
    if (error) {
      setErro('Não conseguimos carregar seus alunos, tente de novo.')
      setAlunos((a) => a ?? [])
      return
    }
    setErro(null)
    setAlunos(data.map((a) => ({ ...a, valor: Number(a.valor) })) as Aluno[])
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  if (!alunos) return <Carregando />

  if (editando) {
    return (
      <AlunoForm
        aluno={editando === 'novo' ? null : editando}
        aoFechar={(mudou) => {
          setEditando(null)
          if (mudou) carregar()
        }}
      />
    )
  }

  return (
    <>
      <h1 className="titulo">Meus alunos</h1>

      <button className="botao botao-principal" onClick={() => setEditando('novo')}>
        + Adicionar aluno
      </button>

      <Aviso texto={erro} />

      {alunos.length === 0 ? (
        <p className="vazio">
          Cadastre seus alunos e o app cria a cobrança mensal de cada um. O aluno paga por Pix, boleto ou
          cartão.
        </p>
      ) : (
        <ul className="lista">
          {alunos.map((a) => (
            <li key={a.id}>
              <button className="item item-botao" onClick={() => setEditando(a)}>
                <div>
                  <strong className="item-nome">{a.nome}</strong>
                  <span className="item-detalhe">
                    {dinheiro(a.valor)} · todo dia {a.dia_vencimento}
                  </span>
                </div>
                <span className="seta">Editar ›</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
