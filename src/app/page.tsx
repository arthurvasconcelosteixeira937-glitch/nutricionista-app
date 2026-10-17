import Link from "next/link";
import { ButtonLink, Logo, WhatsAppIcon } from "@/components/ui";
import { PLAN } from "@/lib/billing";
import { formatMXN } from "@/lib/format";

// Landing page para tráfego de anúncios (Facebook/Instagram). Estática = rápida no celular.
export const dynamic = "force-static";

const steps = [
  {
    title: "Crea tu cobro",
    text: "Escribe el nombre de tu cliente, su WhatsApp y el monto. Listo en 20 segundos.",
  },
  {
    title: "Mándalo por WhatsApp",
    text: "Tu cliente recibe un link para pagar con OXXO, SPEI o tarjeta. El dinero cae directo en tu Mercado Pago.",
  },
  {
    title: "Entrega solo cuando sea real",
    text: "Te avisamos por WhatsApp cuando Mercado Pago confirma el pago: “✅ Pago confirmado. Ya puedes entregar.”",
  },
];

const faqs = [
  {
    q: "¿CobroSeguro guarda mi dinero?",
    a: "No. Nunca tocamos tu dinero. Conectas tu propia cuenta de Mercado Pago y los pagos caen directo ahí. Nosotros solo te damos el software para cobrar y confirmar.",
  },
  {
    q: "¿Cómo sé que un pago es real?",
    a: "Consultamos directamente a Mercado Pago. Un cobro solo aparece como “Pagado ✅” cuando Mercado Pago confirma que el dinero está aprobado en tu cuenta. Un comprobante o captura de pantalla no cuenta.",
  },
  {
    q: "¿Mi cliente necesita descargar algo o registrarse?",
    a: "No. Tu cliente solo abre el link, ve lo que va a pagar y elige OXXO, SPEI o tarjeta.",
  },
  {
    q: "¿Cuánto cobra Mercado Pago?",
    a: "Mercado Pago cobra sus comisiones normales por cada pago, según tu cuenta. CobroSeguro no cobra comisión por venta: solo la suscripción mensual.",
  },
  {
    q: "¿Qué pasa si mi cliente paga en OXXO?",
    a: "El pago en OXXO se confirma cuando la tienda lo reporta a Mercado Pago (puede tardar unas horas). En cuanto se confirma, te avisamos.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí. No hay plazos forzosos. Si cancelas, puedes seguir viendo tu historial de cobros.",
  },
];

export default function LandingPage() {
  return (
    <div className="bg-white">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Entrar
            </Link>
            <ButtonLink href="/registro" className="px-4 py-2 text-sm">
              Empieza gratis
            </ButtonLink>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="bg-gradient-to-b from-brand-50 to-white">
          <div className="mx-auto max-w-5xl px-4 pb-16 pt-12 sm:pt-20">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-brand-800 ring-1 ring-brand-200">
              <span className="h-2 w-2 rounded-full bg-brand-500" /> Para quienes venden por Instagram, TikTok, Facebook y WhatsApp
            </p>
            <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-6xl">
              Se acabaron los comprobantes falsos.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-slate-600 sm:text-xl">
              Cobra por WhatsApp y entrega solo cuando el pago está confirmado de verdad. OXXO, SPEI y tarjeta.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/registro" className="text-lg">
                Empieza gratis
              </ButtonLink>
              <ButtonLink href="#como-funciona" variant="secondary" className="text-lg">
                ¿Cómo funciona?
              </ButtonLink>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              {PLAN.trialDays} días gratis · Sin tarjeta para empezar · Cancela cuando quieras
            </p>

            {/* Mock do aviso no WhatsApp */}
            <div className="mt-12 max-w-sm rounded-2xl bg-[#e7ffdb] p-4 shadow-lg ring-1 ring-green-200">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-green-900">
                <WhatsAppIcon className="h-4 w-4" /> CobroSeguro
              </div>
              <p className="text-[15px] leading-snug text-slate-900">
                ✅ Pago confirmado de <b>$1,250.00 MXN</b> de Ana. Ya puedes entregar.
              </p>
              <p className="mt-1 text-right text-[11px] text-slate-500">12:41 p.m.</p>
            </div>
          </div>
        </section>

        {/* Problema */}
        <section className="mx-auto max-w-5xl px-4 py-14">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl bg-red-50 p-6 ring-1 ring-red-100">
              <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Sin CobroSeguro</p>
              <p className="mt-2 text-lg text-slate-800">
                “Ya te transferí” + una captura editada… y entregas sin haber recibido nada.
              </p>
            </div>
            <div className="rounded-2xl bg-brand-50 p-6 ring-1 ring-brand-100">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-800">Con CobroSeguro</p>
              <p className="mt-2 text-lg text-slate-800">
                Solo entregas cuando Mercado Pago confirma que el dinero está en tu cuenta. Sin capturas, sin dudas.
              </p>
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="bg-slate-50 py-16">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-3xl font-bold tracking-tight">Así de fácil, en 3 pasos</h2>
            <ol className="mt-8 grid gap-5 sm:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 text-lg font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-slate-600">{s.text}</p>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-wrap gap-3 text-sm font-medium text-slate-700">
              {["OXXO", "SPEI", "Tarjeta de débito y crédito", "Directo a tu Mercado Pago"].map((t) => (
                <span key={t} className="rounded-full bg-white px-4 py-2 ring-1 ring-slate-200">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Preço */}
        <section id="precio" className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-3xl font-bold tracking-tight">Un solo plan, sin sorpresas</h2>
          <div className="mt-8 max-w-md rounded-3xl bg-white p-8 shadow-lg ring-2 ring-brand-600">
            <p className="font-semibold text-brand-800">Plan CobroSeguro</p>
            <p className="mt-2">
              <span className="text-5xl font-extrabold">{formatMXN(PLAN.priceMxn).replace(" MXN", "")}</span>
              <span className="text-slate-600"> MXN / mes</span>
            </p>
            <p className="mt-1 text-sm font-medium text-brand-700">{PLAN.trialDays} días gratis para probar</p>
            <ul className="mt-6 space-y-3 text-slate-700">
              {[
                "Cobros ilimitados",
                "Confirmación real con Mercado Pago",
                "Aviso por WhatsApp cuando te pagan",
                "Recordatorios automáticos a tus clientes",
                "Página para verificar cualquier pago",
                "Sin comisión por venta de nuestra parte",
              ].map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-brand-600">✓</span> {f}
                </li>
              ))}
            </ul>
            <ButtonLink href="/registro" className="mt-8 w-full text-lg">
              Empieza gratis
            </ButtonLink>
          </div>
        </section>

        {/* FAQ */}
        <section id="preguntas" className="bg-slate-50 py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-3xl font-bold tracking-tight">Preguntas frecuentes</h2>
            <div className="mt-8 space-y-3">
              {faqs.map((f) => (
                <details key={f.q} className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    {f.q}
                    <span className="text-xl text-slate-400 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-slate-600">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="bg-brand-800 py-16 text-white">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-3xl font-bold">Cobra tranquilo. Entrega seguro.</h2>
            <p className="mt-3 text-brand-100">Empieza hoy con {PLAN.trialDays} días gratis.</p>
            <ButtonLink href="/registro" variant="secondary" className="mt-8 text-lg">
              Empieza gratis
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 text-sm text-slate-500 sm:flex-row">
          <Logo className="text-base" />
          <nav className="flex gap-4">
            <Link href="/privacidad" className="hover:text-slate-800">
              Aviso de Privacidad
            </Link>
            <Link href="/terminos" className="hover:text-slate-800">
              Términos y Condiciones
            </Link>
          </nav>
          <p>© {new Date().getFullYear()} CobroSeguro</p>
        </div>
        <p className="mx-auto mt-4 max-w-3xl px-4 text-center text-xs text-slate-400">
          CobroSeguro no es una institución financiera ni guarda dinero. Los pagos los procesa Mercado Pago en la cuenta de cada
          vendedor. Mercado Pago es una marca de sus respectivos dueños.
        </p>
      </footer>
    </div>
  );
}
