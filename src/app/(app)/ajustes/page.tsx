import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, CreditCard, FileText, MessageCircle, Shield } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { InstallApp } from "@/components/InstallApp";
import { BusinessForm, LogoutButton, PaymentForm } from "./SettingsForms";
import { getUser, requireAppProfile } from "@/lib/data";
import { PRICE_LABEL, SUPPORT_URL } from "@/lib/constants";
import { dateInTz, formatDate } from "@/lib/format";
import { isSubscribed, trialDaysLeft } from "@/lib/subscription";

export const metadata: Metadata = { title: "Ajustes" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 px-1 text-[15px] font-bold uppercase tracking-wide text-ink-muted">{title}</h2>
      {children}
    </section>
  );
}

function LinkRow({ href, icon, label, detail, external }: { href: string; icon: React.ReactNode; label: string; detail?: string; external?: boolean }) {
  const cls = "flex min-h-[60px] items-center gap-3 px-4 py-3 active:bg-gray-50";
  const inner = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">{icon}</span>
      <span className="flex-1">
        <span className="block text-[16px] font-semibold">{label}</span>
        {detail && <span className="block text-sm text-ink-muted">{detail}</span>}
      </span>
      <ChevronRight className="h-5 w-5 text-gray-300" />
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}

export default async function SettingsPage() {
  const [profile, user] = await Promise.all([requireAppProfile(), getUser()]);
  const subscribed = isSubscribed(profile);
  const days = trialDaysLeft(profile);
  const subDetail = subscribed
    ? profile.subscription_current_period_end
      ? `Activa · se renueva el ${formatDate(dateInTz(new Date(profile.subscription_current_period_end), profile.timezone))}`
      : "Activa"
    : `Prueba gratis · ${days} ${days === 1 ? "día" : "días"} restantes`;

  return (
    <>
      <PageHeader title="Ajustes" />
      <p className="px-1 text-[15px] text-ink-muted">{user?.email}</p>

      <Section title="Mi negocio">
        <Card className="p-4">
          <BusinessForm profile={profile} />
        </Card>
      </Section>

      <Section title="Cómo me pagan">
        <Card className="p-4">
          <p className="mb-4 text-[15px] text-ink-soft">Estos datos salen en tus mensajes de cobro.</p>
          <PaymentForm profile={profile} />
        </Card>
      </Section>

      <Section title="Suscripción">
        <Card className="overflow-hidden">
          <LinkRow href="/suscripcion" icon={<CreditCard className="h-5 w-5" />} label="Gestionar suscripción" detail={subscribed ? subDetail : `${subDetail} · ${PRICE_LABEL}/mes`} />
        </Card>
      </Section>

      <Section title="Ayuda">
        <Card className="divide-y divide-gray-100 overflow-hidden">
          <LinkRow href={SUPPORT_URL} external icon={<MessageCircle className="h-5 w-5" />} label="Soporte por WhatsApp" detail="Te ayudamos en español" />
          <LinkRow href="/terminos" icon={<FileText className="h-5 w-5" />} label="Términos y Condiciones" />
          <LinkRow href="/privacidad" icon={<Shield className="h-5 w-5" />} label="Política de Privacidad" />
        </Card>
      </Section>

      <div className="mt-8 space-y-3">
        <InstallApp />
        <LogoutButton />
      </div>
    </>
  );
}
