# Plano técnico — CobroSeguro

## Estrutura de pastas

```
src/
  app/
    page.tsx                  Landing page (es-MX)
    privacidad/, terminos/    Rascunhos legais (LFPDPPP)
    login/, registro/, recuperar/, nueva-contrasena/   Auth (Supabase)
    auth/callback/            Troca do código do Supabase (e-mail de recuperação/confirmação)
    onboarding/               3 passos: negócio → Mercado Pago → WhatsApp
    panel/                    Painel do vendedor (lista, totais, novo cobro, detalhe, ajustes)
    admin/                    Painel admin (só ADMIN_EMAIL)
    p/[code]/                 Página pública de pagamento do cliente
    v/[code]/                 Página pública de verificação (status real)
    api/mp/oauth/{start,callback}   OAuth Mercado Pago
    api/webhooks/mercadopago  Webhook (assinatura + consulta à API + idempotência)
    api/cron/{reconcile,reminders}  Crons da Vercel
  lib/
    format.ts, phone.ts, time.ts, codes.ts, crypto.ts, env.ts
    cobro-status.ts           Regras de status (pagamento → cobro)
    reminders.ts              Regras de lembrete (máx. 2, 9h–20h CDMX)
    billing/                  BillingProvider (manual; pronto para Stripe)
    messaging/                MessagingProvider (cloud_api | manual) + textos
    mercadopago/              OAuth, preferências, pagamentos, assinatura webhook
    payments/                 Processamento do webhook e conciliação (com injeção de dependências → testável)
    supabase/                 Clientes (browser, server, admin/service role)
    rate-limit.ts             Rate limit em Postgres
  proxy.ts                    Renova a sessão do Supabase e protege /panel, /onboarding, /admin
supabase/migrations/          SQL das tabelas + RLS
tests/                        Vitest
```

## Tabelas

| Tabela | Conteúdo | RLS |
|---|---|---|
| `profiles` | negócio, WhatsApp, onboarding, lembretes on/off | vendedor lê/edita só o próprio (campos seguros) |
| `subscriptions` | status (trialing/active/inactive), fim do trial, provedor | vendedor só lê |
| `mp_accounts` | tokens do MP **criptografados** (AES-256-GCM), expiração | sem acesso (só service role) |
| `cobros` | cliente, valor, status, código público, link MP, lembretes | vendedor só lê; escrita só pelo servidor |
| `payments` | pagamentos do MP vinculados ao cobro | vendedor só lê |
| `webhook_events` | idempotência do webhook | sem acesso |
| `message_log` | mensagens enviadas (WhatsApp) | vendedor só lê |
| `rate_limits` | contadores por janela | sem acesso |

Escrita de status é feita **só no servidor** (service role) — assim nem o próprio vendedor consegue
"fingir" um pagamento, e a página /v é confiável.

## Etapas

1. Scaffold (Next.js 16, Tailwind 4, Vitest) e plano.
2. Banco: migration SQL com RLS, trigger de perfil + trial de 7 dias, rate limit.
3. Lógica central com testes: formatos, telefone, criptografia, status, lembretes, billing, mensagens, Mercado Pago.
4. Webhook, conciliação e cron de lembretes, com testes (duplicado, assinatura inválida, só "approved").
5. Interface completa em espanhol (landing, auth, onboarding, painel, páginas públicas, admin, legais, PWA).
6. Revisão de segurança/idioma, build, README e lista final.
