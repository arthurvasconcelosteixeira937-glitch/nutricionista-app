export const formatarBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// (00) 00000-0000
export function mascaraWhatsApp(valor) {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// Celular brasileiro: DDD válido (11–99) + 9 dígitos começando com 9.
export function whatsappValido(valor) {
  const d = valor.replace(/\D/g, '')
  return d.length === 11 && Number(d.slice(0, 2)) >= 11 && d[2] === '9'
}

export const emailValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)

// Data local no formato AAAA-MM-DD (usada para a ofensiva de dias seguidos).
export function hojeISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function ontemISO() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return hojeISO(d)
}

export function embaralhar(lista) {
  const a = [...lista]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const primeiroNome = (nome = '') => nome.trim().split(/\s+/)[0] || ''
