import { CheckCircle2, XCircle } from 'lucide-react'

const LETRAS = ['A', 'B', 'C', 'D', 'E']

// Mostra uma questão. `resposta` = índice escolhido. Com `mostrarGabarito`, pinta certo/errado e mostra a explicação.
export default function Questao({ questao, resposta, aoResponder, mostrarGabarito, rotulo }) {
  const respondida = resposta !== undefined && resposta !== null
  return (
    <div className="animate-fade-up">
      {rotulo && <p className="mb-2 text-xs font-bold uppercase tracking-wider text-navy/50">{rotulo}</p>}
      {questao.texto && (
        <div className="mb-3 whitespace-pre-line rounded-2xl border-l-4 border-energia bg-white p-4 text-[15px] leading-relaxed text-navy/85 shadow-sm">{questao.texto}</div>
      )}
      <p className="mb-3 text-[17px] font-bold leading-snug">{questao.enunciado}</p>
      <div className="space-y-2">
        {questao.alternativas.map((alt, i) => {
          const certa = i === questao.correta
          const escolhida = i === resposta
          let estilo = 'bg-white ring-1 ring-navy/10 active:bg-navy-50'
          let letra = 'bg-navy-50 text-navy'
          if (mostrarGabarito && respondida) {
            if (certa) {
              estilo = 'bg-emerald-50 ring-2 ring-emerald-500'
              letra = 'bg-emerald-500 text-white'
            } else if (escolhida) {
              estilo = 'bg-rose-50 ring-2 ring-rose-500 animate-shake'
              letra = 'bg-rose-500 text-white'
            } else estilo = 'bg-white opacity-60 ring-1 ring-navy/10'
          } else if (escolhida) {
            estilo = 'bg-energia-50 ring-2 ring-energia'
            letra = 'bg-energia text-navy'
          }
          return (
            <button
              key={i}
              disabled={mostrarGabarito && respondida}
              onClick={() => aoResponder(i)}
              className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left text-[15px] transition ${estilo}`}
            >
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm font-extrabold ${letra}`}>{LETRAS[i]}</span>
              <span className="min-w-0 flex-1 pt-0.5">{alt}</span>
              {mostrarGabarito && respondida && certa && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />}
              {mostrarGabarito && respondida && escolhida && !certa && <XCircle className="h-5 w-5 shrink-0 text-rose-600" />}
            </button>
          )
        })}
      </div>
      {mostrarGabarito && respondida && (
        <div className={`mt-4 animate-pop rounded-2xl p-4 ${resposta === questao.correta ? 'bg-emerald-500 text-white' : 'bg-navy text-white'}`}>
          <p className="font-extrabold">{resposta === questao.correta ? '✅ Mandou bem! Resposta certa.' : `❌ Quase! A resposta certa é a ${LETRAS[questao.correta]}.`}</p>
          <p className="mt-1 text-sm leading-relaxed opacity-90">{questao.explicacao}</p>
        </div>
      )}
    </div>
  )
}

export { LETRAS }
