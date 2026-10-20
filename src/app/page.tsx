import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  HandCoins,
  Languages,
  Link2,
  MessageCircle,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { LinkButton } from "@/components/ui/Button";
import { SiteFooter } from "@/components/SiteFooter";
import { PRICE_LABEL, TRIAL_DAYS } from "@/lib/constants";

const STEPS = [
  { icon: ClipboardList, title: "Anota el trabajo", text: "Cliente, servicio y cuánto te deben. Listo en 10 segundos." },
  { icon: BellRing, title: "Toca “Cobrar”", text: "Te damos el mensaje listo, con tus datos de Zelle, Venmo o Cash App." },
  { icon: HandCoins, title: "Recibe tu dinero", text: "Tu cliente paga y tú lo marcas como pagado. Así de fácil." },
];

const BENEFITS = [
  { icon: MessageCircle, title: "Recordatorios por WhatsApp y SMS", text: "Envía el cobro con un toque, sin escribir nada." },
  { icon: Languages, title: "Mensajes en español o inglés", text: "Cada cliente recibe el mensaje en su idioma." },
  { icon: Link2, title: "Links de Zelle, Venmo y Cash App", text: "Tu cliente paga directo desde el mensaje." },
  { icon: FileText, title: "Recibos profesionales en PDF", text: "Envía un recibo bonito cuando te paguen." },
];

const FAQ = [
  {
    q: "¿Necesito tarjeta para la prueba gratis?",
    a: `No. Usas Cóbralo gratis por ${TRIAL_DAYS} días sin poner tarjeta. Si te gusta, te suscribes por ${PRICE_LABEL} al mes.`,
  },
  {
    q: "¿Mis clientes tienen que bajar alguna app?",
    a: "No. Ellos reciben un mensaje normal por WhatsApp o SMS, con tus datos para pagar.",
  },
  {
    q: "¿Cóbralo recibe el dinero por mí?",
    a: "No. El dinero va directo a tu Zelle, Venmo, Cash App o en efectivo. Nosotros nunca tocamos tu dinero.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí. Cancelas en un toque desde Ajustes, sin llamadas ni preguntas. Tus datos se quedan guardados.",
  },
  {
    q: "¿Funciona en mi celular?",
    a: "Sí. Funciona en cualquier iPhone o Android. Puedes instalarlo en tu pantalla de inicio como una app.",
  },
];

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <div className="absolute -inset-6 -z-10 rounded-[48px] bg-brand-light/70 blur-2xl" />
      <div className="rounded-[40px] border-[10px] border-ink bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold">Hola, María</p>
          <span className="rounded-full bg-alert-light px-2 py-0.5 text-[11px] font-semibold text-alert-dark">2 por cobrar</span>
        </div>
        <div className="mb-3 rounded-2xl bg-brand p-3 text-white">
          <p className="text-[11px] opacity-80">Te deben</p>
          <p className="text-2xl font-extrabold">$480.00</p>
        </div>
        {[
          { n: "Jennifer S.", s: "Limpieza de casa", a: "$150.00", d: "6 días de atraso" },
          { n: "Carlos R.", s: "Corte de césped", a: "$80.00", d: "2 días de atraso" },
        ].map((r) => (
          <div key={r.n} className="mb-2 rounded-xl border border-gray-100 p-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold">{r.n}</p>
              <p className="text-[13px] font-bold">{r.a}</p>
            </div>
            <p className="text-[11px] text-ink-muted">{r.s}</p>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="rounded-full bg-alert-light px-2 py-0.5 text-[10px] font-semibold text-alert-dark">{r.d}</span>
              <span className="rounded-lg bg-brand px-3 py-1 text-[11px] font-bold text-white">Cobrar</span>
            </div>
          </div>
        ))}
        <div className="mt-3 rounded-2xl rounded-tl-sm bg-[#DCF8C6] p-3 text-[11px] leading-snug text-ink">
          ¡Hola Jennifer! Te recuerdo el pago de Limpieza de casa del 10/14/2026. Total: $150.00
          <br />• Zelle: maria@email.com
          <br />• Venmo: @maria-clean
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="bg-white">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" aria-label="Cóbralo, inicio">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/entrar" className="flex min-h-[48px] items-center rounded-xl px-3 font-semibold text-brand hover:bg-brand-50">
              Entrar
            </Link>
            <LinkButton href="/registro" className="hidden sm:inline-flex">
              Empieza gratis
            </LinkButton>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 md:grid-cols-2 md:pt-20">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1.5 text-sm font-semibold text-brand">
                <Smartphone className="h-4 w-4" /> Hecho para trabajadores independientes
              </span>
              <h1 className="mt-5 text-[2.35rem] font-extrabold leading-[1.1] tracking-tight text-ink md:text-6xl">
                Deja de perder dinero con clientes que <span className="text-alert">no pagan</span>
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-ink-soft md:text-xl">
                Anota tus trabajos y envía recordatorios de pago por WhatsApp en segundos. Todo en español.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <LinkButton href="/registro" size="lg" className="sm:min-w-[220px]">
                  Empieza gratis <ArrowRight className="h-5 w-5" />
                </LinkButton>
              </div>
              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[15px] text-ink-soft">
                {[`${TRIAL_DAYS} días gratis`, "Sin tarjeta", "Cancela cuando quieras"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="h-5 w-5 text-brand" /> {t}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm text-ink-muted">
                Para limpieza, jardinería, construcción, pintura, mudanzas y handyman.
              </p>
            </div>
            <PhoneMockup />
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section id="como-funciona" className="bg-brand-50 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-extrabold tracking-tight md:text-4xl">Cómo funciona</h2>
            <p className="mt-2 text-center text-lg text-ink-soft">Tres pasos. Nada complicado.</p>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative rounded-3xl bg-white p-6 shadow-card">
                  <span className="absolute right-5 top-5 text-5xl font-extrabold text-brand-light">{i + 1}</span>
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white">
                    <s.icon className="h-7 w-7" />
                  </span>
                  <h3 className="mt-4 text-xl font-bold">
                    {i + 1}) {s.title}
                  </h3>
                  <p className="mt-1 text-[16px] leading-relaxed text-ink-soft">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* BENEFICIOS */}
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-extrabold tracking-tight md:text-4xl">Todo lo que necesitas para cobrar</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {BENEFITS.map((b) => (
                <div key={b.title} className="flex gap-4 rounded-3xl border border-gray-100 p-5 shadow-card">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand">
                    <b.icon className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold">{b.title}</h3>
                    <p className="mt-0.5 text-[16px] text-ink-soft">{b.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRECIO */}
        <section id="precio" className="bg-brand py-16 text-white">
          <div className="mx-auto max-w-md px-4 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">Un precio simple</h2>
            <div className="mt-8 rounded-3xl bg-white p-7 text-ink shadow-2xl">
              <p className="font-semibold text-brand">Plan Cóbralo</p>
              <p className="mt-2">
                <span className="text-5xl font-extrabold">{PRICE_LABEL}</span>
                <span className="text-lg text-ink-muted"> al mes</span>
              </p>
              <ul className="mt-6 space-y-3 text-left text-[16px]">
                {[
                  `Prueba gratis de ${TRIAL_DAYS} días`,
                  "Sin tarjeta para empezar",
                  "Clientes y trabajos ilimitados",
                  "Cobros por WhatsApp y SMS",
                  "Recibos en PDF",
                  "Cancela cuando quieras",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-light">
                      <Check className="h-4 w-4 text-brand" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <LinkButton href="/registro" size="lg" full className="mt-7">
                Empieza gratis
              </LinkButton>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-ink-muted">
                <ShieldCheck className="h-4 w-4" /> Pago seguro con Stripe
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="preguntas" className="py-16">
          <div className="mx-auto max-w-2xl px-4">
            <h2 className="text-center text-3xl font-extrabold tracking-tight md:text-4xl">Preguntas frecuentes</h2>
            <div className="mt-8 space-y-3">
              {FAQ.map((f) => (
                <details key={f.q} className="group rounded-2xl border border-gray-200 bg-white px-5 open:shadow-card">
                  <summary className="flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold">
                    {f.q}
                    <ChevronDown className="h-5 w-5 shrink-0 text-ink-muted transition group-open:rotate-180" />
                  </summary>
                  <p className="pb-5 text-[16px] leading-relaxed text-ink-soft">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="px-4 pb-16">
          <div className="mx-auto max-w-3xl rounded-3xl bg-brand-light px-6 py-12 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-brand">Tu trabajo vale. Cóbralo.</h2>
            <p className="mx-auto mt-3 max-w-md text-lg text-ink-soft">
              Empieza hoy y cobra a tus clientes atrasados en menos de un minuto.
            </p>
            <LinkButton href="/registro" size="lg" className="mt-7 w-full sm:w-auto sm:min-w-[260px]">
              Empieza gratis
            </LinkButton>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
