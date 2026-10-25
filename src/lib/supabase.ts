import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const chaveAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(url, chaveAnon)

/**
 * Chama uma Edge Function e devolve uma mensagem de erro simples se der errado.
 * As funções respondem { erro: "mensagem em português" } quando algo falha.
 */
export async function chamarFuncao<T = any>(nome: string, corpo?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(nome, { body: corpo ?? {} })
  if (error) {
    let mensagem = 'Algo deu errado, tente de novo.'
    const resposta = (error as { context?: Response }).context
    if (resposta && typeof resposta.json === 'function') {
      try {
        const corpoErro = await resposta.json()
        if (corpoErro?.erro) mensagem = corpoErro.erro
      } catch {
        // resposta sem JSON: fica a mensagem padrão
      }
    } else if (error.name === 'FunctionsFetchError') {
      mensagem = 'Sem conexão com a internet. Confira e tente de novo.'
    }
    throw new Error(mensagem)
  }
  return data as T
}
