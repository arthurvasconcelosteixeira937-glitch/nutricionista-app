import { useEffect, useState } from 'react'
import { alvoDaContagem, partesDoTempo } from '../lib/datas.js'

export function useAgora(intervalo = 1000) {
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), intervalo)
    return () => clearInterval(t)
  }, [intervalo])
  return agora
}

function Bloco({ valor, rotulo, escuro }) {
  return (
    <div className={`flex min-w-0 flex-1 flex-col items-center rounded-2xl px-1 py-2 ${escuro ? 'bg-white/10 ring-1 ring-white/15' : 'bg-navy text-white'}`}>
      <span className="text-2xl font-extrabold tabular-nums text-energia sm:text-3xl">{String(valor).padStart(2, '0')}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/80">{rotulo}</span>
    </div>
  )
}

// Contagem regressiva ao vivo até a próxima prova (8/11 e depois 15/11, 13h30 de Brasília).
export default function Contagem({ escuro = true, segundos = true, alvo: alvoFixo }) {
  const agora = useAgora()
  const info = alvoFixo ? { alvo: alvoFixo } : alvoDaContagem(agora)
  if (!info) {
    return <div className="rounded-2xl bg-energia px-4 py-3 text-center font-bold text-navy">🎓 O ENEM 2026 chegou! Boa prova e muito orgulho de você!</div>
  }
  const t = partesDoTempo(info.alvo - agora)
  return (
    <div className="flex gap-2">
      <Bloco valor={t.dias} rotulo="dias" escuro={escuro} />
      <Bloco valor={t.horas} rotulo="horas" escuro={escuro} />
      <Bloco valor={t.minutos} rotulo="min" escuro={escuro} />
      {segundos && <Bloco valor={t.segundos} rotulo="seg" escuro={escuro} />}
    </div>
  )
}
