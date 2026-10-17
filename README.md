# CobroSeguro

App web (PWA) para pequenos vendedores do México que vendem por Instagram, TikTok, Facebook e WhatsApp.
O vendedor cria um cobro, manda pelo WhatsApp, e só entrega quando o **Mercado Pago confirma** que o dinheiro caiu.

- O app **não guarda nem movimenta dinheiro**: cada vendedor conecta a própria conta do Mercado Pago (OAuth) e o dinheiro cai direto nela.
- Vocês vendem só o software (assinatura de 199 MXN/mês com 7 dias grátis).
- Interface em espanhol do México; código comentado em português.

> Plano técnico (pastas, tabelas, etapas): [`docs/PLANO.md`](docs/PLANO.md)

---

## Sumário

1. [Como rodar o projeto](#1-como-rodar-o-projeto)
2. [Criar o banco no Supabase](#2-criar-o-banco-no-supabase)
3. [Criar o app no Mercado Pago Developers](#3-criar-o-app-no-mercado-pago-developers)
4. [Configurar o webhook](#4-configurar-o-webhook)
5. [Pagamento de teste (cartão, OXXO e SPEI)](#5-pagamento-de-teste-cartão-oxxo-e-spei)
6. [WhatsApp Cloud API e templates](#6-whatsapp-cloud-api-e-templates)
7. [Publicar na Vercel](#7-publicar-na-vercel)
8. [Administração e assinaturas](#8-administração-e-assinaturas)
9. [Testes automáticos](#9-testes-automáticos)
10. [Como funciona por dentro (segurança)](#10-como-funciona-por-dentro-segurança)

---

## 1. Como rodar o projeto

Precisa de: **Node.js 20+** e uma conta no **Supabase** (grátis).

```bash
npm install
cp .env.example .env.local     # preencha os valores (explicados dentro do arquivo)
npm run dev                    # abre em http://localhost:3000
```

Comandos úteis:

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm test` | testes automáticos |
| `npm run typecheck` | checagem de tipos |
| `npm run lint` | lint |
| `npm run build` | build de produção |

**Gerar as chaves que você mesmo cria:**

```bash
openssl rand -base64 32   # → TOKEN_ENCRYPTION_KEY
openssl rand -hex 32      # → CRON_SECRET
```

> O app funciona 100% em **modo manual de WhatsApp** (`MESSAGING_MODE=manual`): os botões abrem o WhatsApp do vendedor
> com a mensagem pronta. Você pode testar tudo sem a API da Meta.

> **Supabase local (opcional):** com Docker instalado, `npx supabase start` sobe um Supabase local já com as tabelas
> (pasta `supabase/`). As chaves aparecem no terminal.

---

## 2. Criar o banco no Supabase

1. Em [supabase.com](https://supabase.com) → **New project** (região sugerida: a mais próxima do México, ex. `us-east`/`us-west`).
2. **SQL Editor** → **New query** → cole todo o conteúdo de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) → **Run**.
3. **Project Settings → API**: copie
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (**secreta**)
4. **Authentication → URL Configuration**:
   - *Site URL*: `https://SEU-DOMINIO` (ou `http://localhost:3000` em teste)
   - *Redirect URLs*: adicione `https://SEU-DOMINIO/**` e `http://localhost:3000/**`
5. **Authentication → Email Templates** (para os e-mails saírem em espanhol):
   - *Confirm signup*: assunto “Confirma tu cuenta de CobroSeguro”, corpo = conteúdo de `supabase/templates/confirmacion.html`
   - *Reset password*: assunto “Crea una nueva contraseña de CobroSeguro”, corpo = `supabase/templates/recuperacion.html`
6. (Recomendado para produção) **Authentication → SMTP**: configure um SMTP próprio (Resend, SendGrid, etc.).
   O SMTP padrão do Supabase tem limite baixo de e-mails por hora.

---

## 3. Criar o app no Mercado Pago Developers

O CobroSeguro usa o **OAuth do Mercado Pago (modelo marketplace)**: cada vendedor autoriza o app a criar cobranças **na conta dele**.

1. Entre em [mercadopago.com.mx/developers](https://www.mercadopago.com.mx/developers) com a **sua** conta Mercado Pago México
   (a conta da empresa CobroSeguro).
2. **Tus integraciones → Crear aplicación**.
   - Tipo de solução: **Pagos online** → **Checkout Pro**.
   - Quando perguntar o modelo de integração, escolha **Marketplace** / plataforma que cobra em nome de vendedores.
3. Dentro da aplicação:
   - **Credenciales de producción**: copie o **Client ID** (às vezes chamado *App ID*) → `MP_CLIENT_ID`
     e o **Client Secret** → `MP_CLIENT_SECRET`.
   - **Editar aplicación → Redirect URL (OAuth)**: cadastre exatamente
     `https://SEU-DOMINIO/api/mp/oauth/callback`
     (o Mercado Pago exige https; para testar o OAuth localmente use um túnel, ex. `ngrok`, e coloque essa URL em
     `NEXT_PUBLIC_APP_URL`).
4. `MP_AUTH_URL` já vem com `https://auth.mercadopago.com.mx/authorization`. Se a documentação de OAuth da sua conta
   indicar outra URL, troque nessa variável.

### Contas de teste (México)

1. Na aplicação → **Cuentas de prueba** → crie 2 usuários de teste com país **México**:
   - **Vendedor de teste** (é quem conecta no CobroSeguro)
   - **Comprador de teste** (é quem paga)
2. Para conectar: no app, faça login como vendedor e toque em **Conectar con Mercado Pago** — na tela do Mercado Pago,
   entre com o **usuário e senha do vendedor de teste** (abra numa janela anônima para não usar a sua conta real).
3. Se a documentação pedir tokens de teste no OAuth, coloque `MP_OAUTH_TEST_TOKEN=true` (envia `test_token: true` na troca do código).

> ⚠️ Confirme na documentação atual do Mercado Pago (seção **OAuth**) os nomes exatos dos campos do painel —
> o painel muda com frequência. Os endpoints usados pelo código são: `POST /oauth/token` (troca e renovação),
> `POST /checkout/preferences`, `GET /v1/payments/{id}` e `GET /v1/payments/search`.

---

## 4. Configurar o webhook

1. Na aplicação do Mercado Pago → **Webhooks → Configurar notificaciones**.
2. **URL de producción** (e de teste, se houver campo separado):
   `https://SEU-DOMINIO/api/webhooks/mercadopago`
3. **Eventos**: marque **Pagos** (`payment`).
4. Salve e copie a **Clave secreta / Assinatura secreta** → `MP_WEBHOOK_SECRET`.
5. Cada cobro também envia `notification_url` = `https://SEU-DOMINIO/api/webhooks/mercadopago?source_news=webhooks`
   (só quando `NEXT_PUBLIC_APP_URL` é https).

O que o webhook faz (veja `src/lib/payments/core.ts`):

- valida o header `x-signature` (HMAC-SHA256 do manifest `id:...;request-id:...;ts:...;`). Inválido → **401**;
- **nunca** confia no conteúdo do webhook: busca o pagamento em `GET /v1/payments/{id}` com o token do vendedor;
- só `status = "approved"`, em **MXN**, com valor ≥ ao do cobro e recebido pela conta do vendedor conta como pago;
- é idempotente: o mesmo evento não é processado duas vezes, e o aviso “✅ Pago confirmado” sai uma única vez;
- erro temporário (API fora do ar) → responde 500 para o Mercado Pago reenviar.

Se um webhook se perder, o **cron de segurança** (`/api/cron/reconcile`) consulta os cobros pendentes no Mercado Pago.
As páginas `/p/...` e `/v/...` também consultam o Mercado Pago na hora quando o cobro ainda está pendente.

Teste rápido: no painel do Mercado Pago há a opção **Simular notificación**. Ela deve responder 200 (`ignorado`,
`cuenta_desconocida` ou `pago_no_encontrado`, pois o pagamento simulado não pertence a um vendedor conectado) — e 401 se o segredo estiver errado.

---

## 5. Pagamento de teste (cartão, OXXO e SPEI)

1. Conecte o **vendedor de teste** (seção 3) e crie um cobro no painel.
2. Abra o link `/p/...` numa **janela anônima**, toque em **Pagar** e entre com o **comprador de teste**.
3. **Cartão (aprovação imediata):** use um cartão de teste da documentação do Mercado Pago México
   (*Checkout Pro → Pruebas → Tarjetas de prueba*). Em geral: nome do titular **`APRO`** = aprovado,
   **`OTHE`** = recusado; CVV `123`; validade futura.
   → o cobro vira **Pagado ✅** no painel e `/v/...` mostra **PAGO CONFIRMADO**.
4. **OXXO:** escolha OXXO no checkout. O Mercado Pago gera a ficha com referência e o pagamento fica
   **`pending`** (`pending_waiting_payment`). O cobro **continua Pendiente** — é exatamente o comportamento correto:
   pendente não é pago. Em ambiente de teste normalmente não há como “pagar” a ficha de verdade; a aprovação
   só ocorre com pagamento real no OXXO (em produção leva de minutos a algumas horas).
5. **SPEI:** escolha transferência/SPEI. O Mercado Pago mostra uma CLABE para aquele pagamento e ele fica
   **`pending`** até a transferência cair. Mesmo comportamento do OXXO.
6. Para validar o fluxo de aprovação de OXXO/SPEI ponta a ponta, faça **um pagamento real de valor baixo** (ex. $20 MXN)
   em produção, com sua própria conta conectada.

> Se OXXO ou SPEI não aparecerem no checkout, verifique se estão habilitados na conta do vendedor
> (o app não exclui nenhum meio de pagamento — `excluded_payment_types` vai vazio).

---

## 6. WhatsApp Cloud API e templates

### Modo manual (padrão — funciona sem nada)

`MESSAGING_MODE=manual`: o vendedor toca no botão verde e o WhatsApp abre com a mensagem pronta (`wa.me`).
Recordatórios: o botão “Enviar recordatorio” respeita o máximo de 2 e o horário 9h–20h.
Aviso de pagamento ao vendedor: aparece no painel (no modo manual não há envio automático).

### Modo automático (API oficial da Meta)

1. Crie um **Meta Business** verificado e, em [developers.facebook.com](https://developers.facebook.com), um app do tipo **Business**.
2. Adicione o produto **WhatsApp** e registre o número do CobroSeguro.
3. Em **WhatsApp → API Setup**, copie o **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`.
4. Em **Business Settings → System users**, crie um usuário de sistema, gere um **token permanente** com as permissões
   `whatsapp_business_messaging` e `whatsapp_business_management` → `WHATSAPP_TOKEN`.
5. Crie os 4 templates abaixo em **WhatsApp Manager → Message templates** e aguarde a aprovação.
6. Coloque `MESSAGING_MODE=cloud_api` e faça novo deploy.
   Se alguma variável faltar, o app volta sozinho para o modo manual.

Com a API ativa: o cobro é enviado automaticamente ao cliente; ao confirmar o pagamento o vendedor recebe
“✅ Pago confirmado…” e o cliente recebe o recibo; o cron envia até 2 lembretes (9h–20h, horário do México).

### Templates para aprovar na Meta

Os textos precisam ser **idênticos** aos do arquivo `src/lib/messaging/templates.ts` (se mudar lá, mude na Meta também).
Nome, idioma e corpo:

### `cobro_nuevo`

- **Categoria:** Utility (Utilidad)
- **Idioma:** Spanish (MEX) — `es_MX`
- **Corpo:**

```
Hola {{1}}, {{2}} te envió un cobro de {{3}} por: {{4}}.

Paga seguro con OXXO, SPEI o tarjeta aquí: {{5}}

Tu pago se confirma directo con Mercado Pago.
```

| Variável | Conteúdo | Exemplo |
|---|---|---|
| `{{1}}` | nombre del cliente | Ana |
| `{{2}}` | nombre del negocio | Tienda Luna |
| `{{3}}` | monto | $1,250.00 MXN |
| `{{4}}` | descripción | 2 blusas talla M |
| `{{5}}` | link de pago | https://cobroseguro.mx/p/AbC123 |

### `pago_confirmado_vendedor`

- **Categoria:** Utility (Utilidad)
- **Idioma:** Spanish (MEX) — `es_MX`
- **Corpo:**

```
✅ Pago confirmado de {{1}} de {{2}}. Ya puedes entregar.

Concepto: {{3}}
Verifícalo aquí: {{4}}

Confirmado directo con Mercado Pago.
```

| Variável | Conteúdo | Exemplo |
|---|---|---|
| `{{1}}` | monto | $1,250.00 MXN |
| `{{2}}` | nombre del cliente | Ana |
| `{{3}}` | descripción | 2 blusas talla M |
| `{{4}}` | link de verificación | https://cobroseguro.mx/v/AbC123 |

### `recibo_cliente`

- **Categoria:** Utility (Utilidad)
- **Idioma:** Spanish (MEX) — `es_MX`
- **Corpo:**

```
Hola {{1}}, {{2}} recibió tu pago de {{3}} por: {{4}}.

Folio de Mercado Pago: {{5}}
Puedes verificarlo aquí: {{6}}

¡Gracias por tu compra!
```

| Variável | Conteúdo | Exemplo |
|---|---|---|
| `{{1}}` | nombre del cliente | Ana |
| `{{2}}` | nombre del negocio | Tienda Luna |
| `{{3}}` | monto | $1,250.00 MXN |
| `{{4}}` | descripción | 2 blusas talla M |
| `{{5}}` | folio del pago | 123456789 |
| `{{6}}` | link de verificación | https://cobroseguro.mx/v/AbC123 |

### `recordatorio_pago`

- **Categoria:** Utility (Utilidad)
- **Idioma:** Spanish (MEX) — `es_MX`
- **Corpo:**

```
Hola {{1}}, te recordamos que tienes un pago pendiente de {{2}} con {{3}} por: {{4}}.

Puedes pagar con OXXO, SPEI o tarjeta aquí: {{5}}

Si ya pagaste, ignora este mensaje.
```

| Variável | Conteúdo | Exemplo |
|---|---|---|
| `{{1}}` | nombre del cliente | Ana |
| `{{2}}` | monto | $1,250.00 MXN |
| `{{3}}` | nombre del negocio | Tienda Luna |
| `{{4}}` | descripción | 2 blusas talla M |
| `{{5}}` | link de pago | https://cobroseguro.mx/p/AbC123 |


---

## 7. Publicar na Vercel

1. Suba o código para o GitHub.
2. Em [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório (framework: Next.js, detectado sozinho).
3. Em **Settings → Environment Variables**, cadastre **todas** as variáveis do `.env.example`
   (com `NEXT_PUBLIC_APP_URL` = sua URL final, ex. `https://cobroseguro.mx`). **Não** defina `MP_API_URL`.
4. **Deploy**.
5. Depois do primeiro deploy, atualize as URLs no Supabase (seção 2), no Mercado Pago (Redirect URL e Webhook, seções 3 e 4).
6. Domínio próprio: **Settings → Domains**.

### Cron jobs

O arquivo `vercel.json` já cria 2 crons, que a Vercel chama com `Authorization: Bearer CRON_SECRET`:

| Rota | O que faz | Agenda no arquivo |
|---|---|---|
| `/api/cron/reconcile` | confere no Mercado Pago os cobros pendentes, marca vencidos, renova tokens | 1x/dia (09:00 México) |
| `/api/cron/reminders` | envia lembretes (só com a API do WhatsApp ativa) | 1x/dia (11:00 México) |

⚠️ No plano **Hobby** (grátis) a Vercel só permite cron **1 vez por dia**, por isso a agenda acima.
No plano **Pro**, troque no `vercel.json` para algo como:

```json
{ "path": "/api/cron/reconcile", "schedule": "*/15 * * * *" },
{ "path": "/api/cron/reminders", "schedule": "0 * * * *" }
```

(o código já garante o horário 9h–20h do México e o máximo de 2 lembretes, então rodar de hora em hora é seguro).
Alternativa grátis: um agendador externo (ex. cron-job.org) chamando as rotas com o header
`Authorization: Bearer SEU_CRON_SECRET`.

### PWA

O app é instalável (manifest + service worker). No celular: abrir o site → menu do navegador → **Adicionar à tela inicial**.
O service worker não guarda páginas em cache de propósito: o status de pagamento precisa ser sempre o real.

---

## 8. Administração e assinaturas

- O painel **`/admin`** só abre para o e-mail em `ADMIN_EMAIL` (crie uma conta normal com esse e-mail).
- Lá você vê os vendedores, status da assinatura, conexão com Mercado Pago e número de cobros, e pode
  **Activar 30 días** (ou somar +30 dias) e **Desactivar**.
- Sem assinatura ativa (trial vencido ou desativado), o vendedor vê o painel, mas **não cria cobros novos**
  (checado no servidor, não só na tela).
- A cobrança da assinatura está atrás da interface `BillingProvider` (`src/lib/billing/`). Hoje só existe a
  implementação `manual`. Para Stripe (ou outra): crie uma classe que implemente `BillingProvider`
  (`getAccess`, `createCheckout`, `handleWebhook`), registre em `src/lib/billing/index.ts` e mude `BILLING_PROVIDER`.
  A tabela `subscriptions` já tem `provider_customer_id` e `provider_subscription_id`.

---

## 9. Testes automáticos

```bash
npm test
```

71 testes cobrindo a lógica crítica:

- **Webhook** (`tests/webhook.test.ts`): assinatura inválida/ausente → 401; troca de `data.id` → 401; evento duplicado;
  dois eventos do mesmo pagamento avisam uma vez só; status do corpo ignorado (só vale a API); `pending`, `in_process`,
  `rejected` etc. não contam; valor menor, moeda diferente, conta diferente → rejeitado; reembolso; erro temporário libera
  reenvio; falha no WhatsApp não desfaz o pagamento.
- **Regras** (`tests/rules.test.ts`): status do pagamento, vencimento, **limite de 2 lembretes** e janela 9h–20h do México,
  **bloqueio por assinatura** (trial, ativa, vencida, inativa).
- **Utilitários** (`tests/utils.test.ts`): formato MXN, telefone +52, códigos públicos, criptografia AES-256-GCM,
  manifest da assinatura, preferência do Checkout Pro, fuso do México, templates do WhatsApp.

Além disso, o fluxo completo foi testado de ponta a ponta (navegador real + Supabase local + servidor falso do
Mercado Pago): cadastro → onboarding → OAuth → cobro → WhatsApp manual → webhooks → `/v` → cron → admin.

---

## 10. Como funciona por dentro (segurança)

- **RLS**: o vendedor (navegador) só consegue **ler** os próprios dados. Toda escrita passa pelo servidor depois de
  checar a sessão — ninguém consegue marcar um cobro como pago pelo navegador.
- **Tokens do Mercado Pago** criptografados (AES-256-GCM) na tabela `mp_accounts`, que nem o próprio vendedor lê.
  Renovação automática quando faltam menos de 30 dias para expirar (o refresh token também é trocado e salvo de novo).
- **Códigos públicos** de 18 caracteres aleatórios (~105 bits) — impossíveis de adivinhar.
- **Rate limit** (em Postgres, funciona em serverless) no webhook, páginas públicas, login/cadastro e ações do painel.
- **OAuth** com `state` aleatório em cookie httpOnly de uso único (proteção CSRF).
- Cabeçalhos de segurança (HSTS, X-Frame-Options, Referrer-Policy etc.) em `next.config.ts`.
- Nenhuma chave secreta no front-end (só `NEXT_PUBLIC_*`, que são públicas por natureza).

### Rascunhos legais

`/privacidad` (Aviso de Privacidad, LFPDPPP) e `/terminos` são **rascunhos**: preencha os campos entre `[colchetes]`
(razão social, endereço, e-mails) e **peça revisão de um advogado no México** antes de divulgar.
