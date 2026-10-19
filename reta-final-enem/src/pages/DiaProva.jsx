import { Check, Clock, MapPin } from 'lucide-react'
import { CabecalhoPagina } from '../components/AppShell.jsx'
import { CHECKLIST_PROVA, DIAS_PROVA, DICAS_PROVA, HORARIOS } from '../data/diaProva.js'
import { useStore } from '../lib/store.jsx'

export default function DiaProva() {
  const { checkProva, alternarCheck } = useStore()
  const feitos = CHECKLIST_PROVA.filter((c) => checkProva[c.id]).length
  return (
    <div className="space-y-4">
      <CabecalhoPagina titulo="Dia da Prova" subtitulo="Tudo pronto pra não ter surpresa" />

      <div className="grid grid-cols-2 gap-2">
        {DIAS_PROVA.map((d) => (
          <div key={d.dia} className="rounded-3xl bg-navy p-4 text-white">
            <p className="text-xs font-bold uppercase tracking-wider text-energia">{d.dia}</p>
            <p className="mt-1 text-sm font-extrabold leading-tight">{d.data}</p>
            <p className="mt-2 text-xs text-white/75">{d.provas}</p>
            <p className="mt-2 text-xs font-semibold text-white/60">
              {d.duracao} de prova · até {d.termino}
            </p>
          </div>
        ))}
      </div>

      <section className="card">
        <h2 className="flex items-center gap-2 font-extrabold">
          <Clock className="h-5 w-5 text-energia-600" /> Horários (Brasília)
        </h2>
        <ol className="mt-3 space-y-2">
          {HORARIOS.map((h) => (
            <li key={h.hora} className="flex items-center gap-3">
              <span className="w-24 shrink-0 rounded-xl bg-energia px-2 py-1 text-center text-sm font-extrabold text-navy">{h.hora}</span>
              <span className="text-sm font-semibold">{h.evento}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-extrabold">🎒 O que levar</h2>
          <span className="rounded-full bg-navy px-3 py-1 text-xs font-extrabold text-energia">
            {feitos}/{CHECKLIST_PROVA.length}
          </span>
        </div>
        <ul className="space-y-2">
          {CHECKLIST_PROVA.map((c) => {
            const ok = !!checkProva[c.id]
            return (
              <li key={c.id}>
                <button
                  onClick={() => alternarCheck('checkProva', c.id)}
                  role="checkbox"
                  aria-checked={ok}
                  className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left text-sm font-semibold transition ${ok ? 'bg-emerald-50' : 'bg-white ring-1 ring-navy/10'}`}
                >
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${ok ? 'bg-emerald-500 text-white' : 'ring-2 ring-navy/20'}`}>
                    {ok && <Check className="h-4 w-4" strokeWidth={3.5} />}
                  </span>
                  <span className={`flex-1 ${ok ? 'text-navy/50 line-through' : ''}`}>{c.texto}</span>
                  {c.obrigatorio && <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">OBRIGATÓRIO</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-extrabold">💡 Dicas de quem já passou</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {DICAS_PROVA.map((d) => (
            <div key={d.titulo} className="card">
              <h3 className="font-extrabold">{d.titulo}</h3>
              <p className="mt-1 text-sm text-navy/75">{d.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="flex items-start gap-2 rounded-2xl bg-energia-50 p-3 text-xs text-navy/70 ring-1 ring-energia">
        <MapPin className="h-4 w-4 shrink-0" /> Confira sempre as regras oficiais no edital e na Página do Participante do INEP. Não somos afiliados ao INEP/MEC.
      </p>
    </div>
  )
}
