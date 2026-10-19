import { PenLine, Calculator, Globe2, Zap } from 'lucide-react'

const ICONES = { pen: PenLine, calc: Calculator, globe: Globe2 }

// Capa de e-book desenhada em CSS (estilo capa de livro), com a cor própria de cada e-book.
export default function EbookCapa({ ebook, mini = false }) {
  const { de, para, destaque, icone } = ebook.capa
  const Icone = ICONES[icone] || Zap
  const textoEscuro = destaque === '#0B1E3F'
  return (
    <div
      className="relative aspect-[3/4] w-full overflow-hidden rounded-r-lg rounded-l-sm shadow-[6px_8px_18px_rgba(11,30,63,.35)]"
      style={{ background: `linear-gradient(150deg, ${de}, ${para})` }}
    >
      {/* lombada */}
      <div className="absolute inset-y-0 left-0 w-[7%] bg-black/25" />
      <div className="absolute inset-y-0 left-[7%] w-px bg-white/30" />
      {/* círculos decorativos */}
      <div className="absolute -right-1/4 -top-[12%] aspect-square w-3/4 rounded-full opacity-20" style={{ background: destaque }} />
      <div className="absolute -bottom-[10%] -left-[10%] aspect-square w-1/2 rounded-full bg-white/10" />
      {!mini && (
        <div className={`relative flex h-full flex-col justify-between py-[9%] pl-[16%] pr-[8%] ${textoEscuro ? 'text-navy' : 'text-white'}`}>
          <span className="flex items-center gap-1 text-[clamp(7px,2.2vw,10px)] font-bold uppercase tracking-widest opacity-90">
            <Zap className="h-3 w-3" style={{ color: destaque }} fill="currentColor" /> Reta Final ENEM
          </span>
          <div>
            <Icone className="mb-2 h-[18%] w-[18%] min-h-5 min-w-5" style={{ color: destaque }} strokeWidth={2.4} />
            <h3 className="text-[clamp(12px,4vw,17px)] font-extrabold leading-tight">{ebook.titulo}</h3>
            <p className="mt-1 text-[clamp(8px,2.4vw,11px)] font-medium leading-snug opacity-85">{ebook.subtitulo}</p>
          </div>
          <span className="h-1 w-1/3 rounded-full" style={{ background: destaque }} />
        </div>
      )}
      {mini && <Icone className="absolute left-1/2 top-1/2 h-1/3 w-1/3 -translate-x-1/3 -translate-y-1/2" style={{ color: destaque }} />}
    </div>
  )
}
