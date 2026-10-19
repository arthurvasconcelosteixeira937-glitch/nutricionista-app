// Leitura e escrita segura no localStorage (não quebra em modo anônimo ou navegador bloqueado).
const CHAVE = 'retaFinalEnem:v1'

export function carregar() {
  try {
    const bruto = window.localStorage.getItem(CHAVE)
    return bruto ? JSON.parse(bruto) : null
  } catch {
    return null
  }
}

export function salvar(estado) {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(estado))
  } catch {
    /* sem espaço ou bloqueado: segue só na memória */
  }
}
