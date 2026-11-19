import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useExpo } from '@/data/store';
import { submitBrandApplication } from '@/data/repositories';
import type { BoothTier } from '@/domain/types';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { Field, Notice, Segmented } from '@/components/ui';
import { signIn } from '@/services/auth';
import { money } from '@/lib/util';

export default function ApplyPage() {
  const st = useExpo();
  const [f, setF] = useState({ name: '', segment: '', description: '', contactEmail: '', website: '', tier: 'standard' as BoothTier, auth: false });
  const [doneId, setDoneId] = useState<string | null>(null);
  const valid = f.name.trim().length > 1 && f.segment.trim() && /\S+@\S+\.\S+/.test(f.contactEmail) && f.auth;
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {doneId ? (
          <div className="text-center">
            <CheckCircle2 size={56} className="mx-auto text-emerald-400" />
            <h1 className="mt-4 font-display text-4xl font-bold uppercase">Inscrição enviada</h1>
            <p className="mt-2 text-zinc-400">A equipe da plataforma vai analisar sua inscrição. Enquanto isso, você já pode montar seu estande e cadastrar produtos.</p>
            <div className="mt-6 flex justify-center gap-2">
              <Link to="/empresa" className="btn-gold" onClick={() => signIn({ role: 'brand', brandId: doneId, name: f.name })}>Acessar painel da empresa</Link>
              <Link to="/" className="btn-ghost">Início</Link>
            </div>
          </div>
        ) : (
          <>
            <p className="eyebrow">Para marcas</p>
            <h1 className="mt-2 font-display text-5xl font-bold uppercase">Expor na feira</h1>
            <p className="mt-2 text-zinc-400">Inscreva sua marca para a próxima temporada. Após aprovação, seu estande é posicionado no pavilhão.</p>
            <div className="card mt-8 space-y-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome da marca"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
                <Field label="Segmento"><input className="input" placeholder="Ex.: proteínas, pré-treinos, vestuário" value={f.segment} onChange={(e) => setF({ ...f, segment: e.target.value })} /></Field>
                <Field label="E-mail comercial"><input className="input" type="email" value={f.contactEmail} onChange={(e) => setF({ ...f, contactEmail: e.target.value })} /></Field>
                <Field label="Site (opcional)"><input className="input" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></Field>
              </div>
              <Field label="Sobre a marca"><textarea className="input min-h-[90px]" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
              <Field label="Plano de interesse">
                <Segmented value={f.tier} options={(['standard', 'premium', 'master'] as BoothTier[]).map((t) => ({ value: t, label: `${t} · ${money(st.monetization.participationFee[t])}` }))} onChange={(v) => setF({ ...f, tier: v })} />
              </Field>
              <label className="flex items-start gap-2 text-sm text-zinc-300">
                <input type="checkbox" className="mt-1 accent-[#e9c46a]" checked={f.auth} onChange={(e) => setF({ ...f, auth: e.target.checked })} />
                Declaro que represento esta marca e que tenho autorização para usar seu nome, logotipo e identidade visual na plataforma.
              </label>
              <Notice tone="blue" title="Cobrança da participação">A cobrança do plano (boleto/Pix/cartão) e a emissão de nota fiscal são integrações pendentes. Nenhum valor será cobrado neste protótipo.</Notice>
              <button className="btn-gold w-full" disabled={!valid} onClick={() => setDoneId(submitBrandApplication({ name: f.name.trim(), segment: f.segment.trim(), description: f.description.trim(), contactEmail: f.contactEmail.trim(), website: f.website.trim() || undefined, tier: f.tier }).id)}>
                Enviar inscrição
              </button>
            </div>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
