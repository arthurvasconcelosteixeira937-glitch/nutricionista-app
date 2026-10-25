# Aluno em Dia

App (celular primeiro) para **personal trainers** cobrarem a mensalidade dos alunos de forma automática,
usando **Supabase** (login, banco e Edge Functions) e **Asaas** (Pix, boleto e cartão).

## Como funciona

| Parte | O que faz |
| --- | --- |
| Cadastro do personal | E-mail e senha → dados pessoais → a função `criar-subconta` cria a **subconta Asaas** do personal (`POST /accounts`), já com o webhook configurado. A `apiKey` da subconta fica só na tabela `personais_chaves`, que o navegador não consegue ler. |
| Assinatura do app | Na mesma função, o personal vira cliente da **conta principal** e ganha uma assinatura de **R$ 29,90/mês** com o 1º vencimento em **7 dias** (teste grátis). |
| Alunos | `salvar-aluno` cria o cliente (`POST /customers`) e a assinatura mensal (`POST /subscriptions`, `billingType: "UNDEFINED"`) **na subconta do personal**, com split de **R$ 0,99** para `ASAAS_WALLET_ID`. `remover-aluno` cancela tudo no Asaas. |
| Painel | "A receber este mês", "Recebido" e "Atrasado" + lista colorida (verde pago, amarelo aguardando, vermelho atrasado) e botão **Cobrar no WhatsApp** (link `wa.me` com a mensagem pronta). Atualiza sozinho (Realtime). |
| Webhook | `asaas-webhook` recebe `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE` (e criação/alteração/exclusão) e atualiza as cobranças. |
| Bloqueio | Se a mensalidade do app passar de **5 dias** de atraso, o app mostra **"Renove sua assinatura"** com o link de pagamento. O bloqueio também vale no banco (RLS) e nas funções. |

## Estrutura

```
src/                      App React (Vite + TypeScript)
supabase/migrations/      Tabelas, RLS e função app_bloqueado()
supabase/functions/
  criar-subconta/         Subconta Asaas + assinatura do app (7 dias grátis)
  salvar-aluno/           Cria/edita aluno, cliente e assinatura com split
  remover-aluno/          Cancela assinatura e remove o aluno
  asaas-webhook/          Recebe os avisos do Asaas
  sincronizar-assinatura/ Botão "Já paguei" da tela de bloqueio
  _shared/                Cliente Asaas, Supabase e utilidades
```

## Passo a passo para colocar no ar

### 1. Supabase

```bash
npm install
npx supabase login
npx supabase link --project-ref SEU_PROJETO
npx supabase db push                     # cria tabelas, RLS e funções
```

Em **Authentication → Providers → Email**, você pode desligar "Confirm email" para o personal entrar direto.
Se deixar ligado, ele confirma o e-mail e, ao entrar, cai no passo 2 do cadastro.

### 2. Segredos (só no servidor)

```bash
npx supabase secrets set \
  ASAAS_API_KEY='chave_da_conta_principal' \
  ASAAS_WALLET_ID='walletId_da_conta_principal' \
  ASAAS_BASE_URL='https://api-sandbox.asaas.com/v3' \
  ASAAS_WEBHOOK_TOKEN='uma-senha-longa-e-aleatoria-com-32-ou-mais-caracteres'
```

- Modo teste: `https://api-sandbox.asaas.com/v3` · Produção: `https://api.asaas.com/v3`.
- `ASAAS_WEBHOOK_TOKEN` é o token que o Asaas envia no cabeçalho `asaas-access-token`; o webhook recusa avisos sem ele.
- Todas as chamadas ao Asaas usam o cabeçalho `access_token`.

### 3. Edge Functions

```bash
npx supabase functions deploy
```

O `supabase/config.toml` já deixa o `asaas-webhook` sem exigir login do Supabase (o Asaas não tem esse login;
a proteção é o `ASAAS_WEBHOOK_TOKEN`).

### 4. Webhook da conta principal

As subcontas dos personais já nascem com o webhook configurado. Para a **sua conta principal** (que recebe os
R$ 29,90), configure uma vez no painel do Asaas em **Integrações → Webhooks**:

- URL: `https://SEU_PROJETO.supabase.co/functions/v1/asaas-webhook`
- Token de autenticação: o mesmo `ASAAS_WEBHOOK_TOKEN`
- Eventos: `PAYMENT_CREATED`, `PAYMENT_UPDATED`, `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`
- Envio: sequencial

### 5. App

```bash
cp .env.example .env    # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev             # desenvolvimento
npm run build           # gera a pasta dist/ para publicar (Vercel, Netlify, etc.)
```

## Segurança

- RLS ligado em todas as tabelas: cada personal só **lê** os próprios alunos, cobranças e assinatura.
- O navegador não grava nada direto no banco: toda gravação passa pelas Edge Functions, que conferem quem é o usuário.
- `personais_chaves` (apiKey das subcontas) não tem nenhuma política de acesso: só a service role lê.
- Chaves do Asaas existem apenas nos segredos do Supabase.

## Observações

- O dia de vencimento vai de 1 a 28 (para funcionar em todos os meses). O valor mínimo do Asaas é R$ 5,00.
- O CPF do aluno é opcional no app; se o Asaas exigir para alguma forma de pagamento, a mensagem aparece na tela.
- Em produção, o Asaas pode pedir documentos para aprovar cada subconta antes de liberar os saques.
