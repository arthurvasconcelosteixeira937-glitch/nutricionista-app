export default function Aviso({ texto, tipo = 'erro' }: { texto: string | null; tipo?: 'erro' | 'ok' }) {
  if (!texto) return null
  return (
    <div className={`aviso aviso-${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>
      {texto}
    </div>
  )
}
