import { ArrowRight, Brain, BookOpenText, PenLine, Timer, CalendarCheck, Layers, Star, ChevronDown, Smartphone, Target, Trophy, Zap, Check } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import Contagem, { useAgora } from '../components/Contagem.jsx'
import { CardsPlanos, FaixaOferta, VitrineEbooks } from '../components/Ofertas.jsx'
import WhatsAppFlutuante from '../components/WhatsAppFlutuante.jsx'
import Compartilhar from '../components/Compartilhar.jsx'
import { DEPOIMENTOS, FAQ } from '../data/landing.js'
import { alvoDaContagem, partesDoTempo } from '../lib/datas.js'
import { navegar } from '../lib/router.js'
import { useStore } from '../lib/store.jsx'

const PASSOS = [
  { icone: Smartphone, titulo: 'Entre em 10 segundos', texto: 'Só nome e WhatsApp. Sem senha, sem enrolação.' },
  { icone: Target, titulo: 'Faça a missão do dia', texto: 'Um quiz, um resumo e 5 flashcards. 20 a 40 minutos.' },
  { icone: Trophy, titulo: 'Chegue pronto na prova', texto: 'Em 21 dias você revisa o que mais cai no ENEM.' },
]

const RECURSOS = [
  { icone: Brain, titulo: 'Quizzes estilo ENEM', texto: '80 questões originais com explicação de cada resposta.', cor: 'bg-violet-100 text-violet-700' },
  { icone: BookOpenText, titulo: 'Resumos com macetes', texto: '20 resumos dos temas que mais caem, direto ao ponto.', cor: 'bg-orange-100 text-orange-700' },
  { icone: PenLine, titulo: 'Redação sem travar', texto: 'Estrutura pronta, 8 temas e repertórios para usar.', cor: 'bg-rose-100 text-rose-700' },
  { icone: Timer, titulo: 'Simulado relâmpago', texto: '20 questões com cronômetro, igual ao clima da prova.', cor: 'bg-sky-100 text-sky-700' },
  { icone: CalendarCheck, titulo: 'Plano diário de 21 dias', texto: 'Você sempre sabe o que estudar hoje.', cor: 'bg-emerald-100 text-emerald-700' },
  { icone: Layers, titulo: '40 flashcards', texto: 'Memorize fórmulas e conceitos em minutos.', cor: 'bg-amber-100 text-amber-700' },
]

function Titulo({ chapeu, children, claro }) {
  return (
    <div className="mb-6 text-center">
      <span className="text-xs font-extrabold uppercase tracking-[.2em] text-energia-600">{chapeu}</span>
      <h2 className={`titulo-secao mt-1 ${claro ? 'text-white' : 'text-navy'}`}>{children}</h2>
    </div>
  )
}

function MockupCelular() {
  return (
    <div className="relative mx-auto w-56 animate-float sm:w-64" aria-hidden="true">
      <div className="rounded-[2.2rem] bg-navy-950 p-2 shadow-2xl shadow-black/50 ring-2 ring-white/15">
        <div className="overflow-hidden rounded-[1.8rem] bg-navy-50">
          <div className="bg-navy px-4 pb-4 pt-5 text-white">
            <p className="text-[10px] text-white/60">Fala, Ana! Bora revisar?</p>
            <div className="mt-2 flex gap-1.5">
              {['19', '08', '42'].map((n, i) => (
                <span key={i} className="flex-1 rounded-lg bg-white/10 py-1 text-center text-sm font-extrabold text-energia">
                  {n}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-2 p-3">
            <div className="rounded-xl bg-white p-2.5 shadow-sm">
              <p className="text-[10px] font-bold text-navy">🎯 Missão de hoje · Dia 4</p>
              {['Resumo: Ecologia', 'Quiz de Natureza', '5 flashcards'].map((t, i) => (
                <p key={t} className="mt-1.5 flex items-center gap-1.5 text-[10px] text-navy/80">
                  <span className={`grid h-3.5 w-3.5 place-items-center rounded ${i < 2 ? 'bg-emerald-500 text-white' : 'ring-1 ring-navy/30'}`}>
                    {i < 2 && <Check className="h-2.5 w-2.5" strokeWidth={4} />}
                  </span>
                  {t}
                </p>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white p-2 text-center shadow-sm">
                <p className="text-base">🔥</p>
                <p className="text-[10px] font-bold text-navy">4 dias</p>
              </div>
              <div className="rounded-xl bg-white p-2 text-center shadow-sm">
                <p className="text-base">⚡</p>
                <p className="text-[10px] font-bold text-navy">320 XP</p>
              </div>
            </div>
            <div className="rounded-xl bg-white p-2.5 shadow-sm">
              {[
                ['Linguagens', 80, 'bg-violet-500'],
                ['Matemática', 60, 'bg-blue-500'],
              ].map(([n, v, c]) => (
                <div key={n} className="mb-1 last:mb-0">
                  <p className="text-[9px] font-semibold text-navy/70">{n}</p>
                  <div className="h-1.5 rounded-full bg-navy-50">
                    <div className={`h-1.5 rounded-full ${c}`} style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <span className="absolute -left-6 top-24 rotate-[-8deg] rounded-xl bg-energia px-2.5 py-1.5 text-xs font-extrabold text-navy shadow-lg">+10 XP ⚡</span>
      <span className="absolute -right-5 bottom-16 rotate-6 rounded-xl bg-emerald-500 px-2.5 py-1.5 text-xs font-extrabold text-white shadow-lg">Acertou! ✅</span>
    </div>
  )
}

export default function Landing() {
  const { usuario } = useStore()
  const agora = useAgora(60000)
  const info = alvoDaContagem(agora)
  const dias = info ? partesDoTempo(info.alvo - agora).dias : 0
  const comecar = () => navegar(usuario ? '/app' : '/entrar')

  return (
    <div className="min-h-screen bg-navy-50">
      {/* Topo */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Logo compacto />
          <button onClick={comecar} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20 active:scale-95">
            {usuario ? 'Abrir app' : 'Entrar'}
          </button>
        </div>
      </header>

      {/* HERO / CAPA */}
      <section className="relative overflow-hidden bg-navy pb-14 pt-8 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-energia/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <svg className="pointer-events-none absolute right-2 top-10 h-40 w-40 text-energia/10 sm:h-72 sm:w-72" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M13 2 3 14h7l-1 8 10-12h-7z" />
        </svg>
        <div className="relative mx-auto grid max-w-5xl items-center gap-10 px-4 md:grid-cols-[1.2fr_1fr]">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-energia/15 px-3 py-1 text-xs font-bold text-energia ring-1 ring-energia/30">
              <Zap className="h-3.5 w-3.5" fill="currentColor" /> ENEM 2026 · 8 e 15 de novembro
            </span>
            <h1 className="mt-4 text-[2.1rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
              {info ? (
                <>
                  Faltam{' '}
                  <span className="text-energia">
                    {dias} {dias === 1 ? 'dia' : 'dias'}
                  </span>{' '}
                  para o {info.rotulo === '1º dia do ENEM' ? 'ENEM' : '2º dia do ENEM'}.
                </>
              ) : (
                <>
                  O ENEM chegou. <span className="text-energia">Você consegue!</span>
                </>
              )}
              <span className="mt-2 block text-2xl font-bold text-white/90 sm:text-3xl">Revise tudo em 21 dias, direto do celular.</span>
            </h1>
            <p className="mt-4 max-w-md text-white/75">Quizzes no estilo ENEM, resumos com macetes, redação, simulado e um plano diário que diz exatamente o que estudar hoje.</p>
            <div className="mt-6 max-w-md">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">Contagem para o {info?.rotulo || 'ENEM'} · 13h30 (Brasília)</p>
              <Contagem />
            </div>
            <button onClick={comecar} className="btn btn-primario mt-6 w-full max-w-md py-4 text-lg">
              Começar grátis agora <ArrowRight className="h-5 w-5" />
            </button>
            <p className="mt-2 max-w-md text-center text-xs text-white/60">✅ Sem cartão · só nome e WhatsApp · leva 10 segundos</p>
          </div>
          <MockupCelular />
        </div>
      </section>

      {/* Números */}
      <section className="relative z-10 mx-auto -mt-7 max-w-5xl px-4">
        <div className="grid grid-cols-4 divide-x divide-navy/10 rounded-3xl bg-white py-4 text-center shadow-xl ring-1 ring-navy/5">
          {[
            ['80', 'questões'],
            ['20', 'resumos'],
            ['40', 'flashcards'],
            ['21', 'dias'],
          ].map(([n, t]) => (
            <div key={t} className="px-1">
              <p className="text-xl font-extrabold text-navy sm:text-3xl">{n}</p>
              <p className="text-[11px] font-semibold text-navy/60 sm:text-sm">{t}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section className="mx-auto max-w-5xl px-4 py-14">
        <Titulo chapeu="Simples assim">Como funciona</Titulo>
        <div className="grid gap-4 md:grid-cols-3">
          {PASSOS.map((p, i) => (
            <div key={p.titulo} className="card flex items-start gap-4 p-5">
              <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-navy text-energia">
                <p.icone className="h-6 w-6" />
                <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-energia text-xs font-extrabold text-navy">{i + 1}</span>
              </span>
              <div>
                <h3 className="font-extrabold">{p.titulo}</h3>
                <p className="mt-1 text-sm text-navy/70">{p.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* O que tem dentro */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-5xl px-4">
          <Titulo chapeu="Tudo num app só">O que tem dentro</Titulo>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {RECURSOS.map((r) => (
              <div key={r.titulo} className="rounded-3xl bg-navy-50 p-4">
                <span className={`grid h-11 w-11 place-items-center rounded-2xl ${r.cor}`}>
                  <r.icone className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-sm font-extrabold leading-tight sm:text-base">{r.titulo}</h3>
                <p className="mt-1 text-xs text-navy/70 sm:text-sm">{r.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Depoimentos — EXEMPLO: troque em src/data/landing.js */}
      <section className="mx-auto max-w-5xl px-4 py-14">
        <Titulo chapeu="Quem já usa">O que a galera diz</Titulo>
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
          {DEPOIMENTOS.map((d) => (
            <figure key={d.nome} className="card w-[82%] shrink-0 snap-center p-5 md:w-auto">
              <div className="flex gap-0.5 text-energia">
                {Array.from({ length: d.nota }).map((_, i) => (
                  <Star key={i} className="h-4 w-4" fill="currentColor" />
                ))}
              </div>
              <blockquote className="mt-3 text-sm text-navy/80">“{d.texto}”</blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-navy font-bold text-energia">{d.nome[0]}</span>
                <span>
                  <span className="block text-sm font-bold">{d.nome}</span>
                  <span className="text-xs text-navy/60">{d.cidade}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="bg-navy py-14">
        <div className="mx-auto max-w-5xl px-4">
          <Titulo chapeu="Escolha seu plano" claro>
            Comece grátis. Libere tudo quando quiser.
          </Titulo>
          <div className="mb-8">
            <FaixaOferta />
          </div>
          <CardsPlanos />
          <p className="mt-4 text-center text-xs text-white/60">Pagamento único · sem mensalidade · acesso até o ENEM 2026</p>
        </div>
      </section>

      {/* E-books */}
      <section id="ebooks" className="mx-auto max-w-5xl px-4 py-14">
        <Titulo chapeu="Para turbinar">E-books da Reta Final</Titulo>
        <VitrineEbooks />
      </section>

      {/* FAQ */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-3xl px-4">
          <Titulo chapeu="Tira-dúvidas">Perguntas frequentes</Titulo>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <details key={f.p} className="group rounded-2xl bg-navy-50 p-4 open:bg-energia-50 open:ring-1 open:ring-energia">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold">
                  {f.p}
                  <ChevronDown className="h-5 w-5 shrink-0 transition group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-sm text-navy/75">{f.r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-navy px-4 py-14 text-center text-white">
        <h2 className="titulo-secao mx-auto max-w-lg">A aprovação começa com o primeiro dia. Que tal hoje?</h2>
        <button onClick={comecar} className="btn btn-primario mx-auto mt-6 w-full max-w-sm py-4 text-lg">
          Começar grátis agora <ArrowRight className="h-5 w-5" />
        </button>
        <Compartilhar className="mx-auto mt-3 w-full max-w-sm bg-white/10 text-white ring-1 ring-white/20" />
      </section>

      <footer className="bg-navy-950 px-4 pb-24 pt-8 text-center text-xs text-white/50">
        <div className="mb-3 flex justify-center">
          <Logo compacto />
        </div>
        <p className="font-semibold text-white/70">Não somos afiliados ao INEP/MEC.</p>
        <p className="mt-1">Material independente de estudo para o ENEM. © {new Date().getFullYear()} Reta Final ENEM.</p>
      </footer>

      <WhatsAppFlutuante />
    </div>
  )
}
