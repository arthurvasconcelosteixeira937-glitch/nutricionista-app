# Tô em Dia: plano do teste com tráfego pago

**Objetivo do teste (7 dias):**
- descobrir qual das 3 chamadas traz interessados mais baratos;
- descobrir se as pessoas **pagam** antes do app existir.

Só depois disso a gente constrói o app.

> "Tô em Dia" é um nome provisório. Antes de investir na marca, confira se o domínio está livre e se o nome não está registrado no INPI (busca.inpi.gov.br).

---

## 1. Colocar a página no ar (grátis, uns 40 minutos)

Você vai criar 2 contas grátis: **Supabase** (guarda os cadastros com segurança) e **Netlify** (coloca a página no ar com um link). Não precisa de domínio.

### 1.1 Supabase: o banco de dados dos cadastros
1. Crie uma conta em [supabase.com](https://supabase.com) e clique em **New project**.
   - Escolha a região **South America (São Paulo)**.
   - Guarde a senha do banco.
2. No menu da esquerda, vá em **SQL Editor**, cole todo o arquivo `supabase.sql` e clique em **Run**.
3. Crie o **seu usuário de administrador**:
   - Vá em **Authentication → Users → Add user → Create new user**.
   - Use o seu e-mail e uma **senha forte**, com mais de 12 caracteres misturando letras e números.
   - Marque **Auto Confirm User**.
4. Volte no **SQL Editor** e rode esta linha, trocando pelo seu e-mail:
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'SEU-EMAIL@exemplo.com';
   ```
5. **Feche o cadastro de novos usuários,** para ninguém mais criar conta: vá em **Authentication → Sign In / Providers** e desligue **Allow new users to sign up**. Mesmo que alguém criasse uma conta, ela não veria nada, porque só quem está na tabela `admins` vê os cadastros.
6. Vá em **Project Settings → API** e copie:
   - o **Project URL**;
   - a chave **anon public**. Essa pode ficar na página. **Nunca** use a chave `service_role`.

### 1.2 Configurar
Abra o arquivo `config.js` e preencha:
- `WHATSAPP`: o WhatsApp da empresa, só números, com 55 e DDD;
- `SUPABASE_URL` e `SUPABASE_ANON_KEY`: o que você copiou no passo anterior;
- `PIXEL_ID`: o ID do seu Pixel da Meta.

Se você esquecer o Supabase, a página mostra uma faixa vermelha avisando que os cadastros não estão sendo salvos.

### 1.3 Netlify: colocar no ar
1. Crie uma conta grátis em [netlify.com](https://netlify.com).
2. Abra [app.netlify.com/drop](https://app.netlify.com/drop) no computador e arraste a pasta `to-em-dia` inteira, já com o `config.js` preenchido.
3. Em **Site configuration → Change site name**, troque o nome. Por exemplo `toemdia`, que vira `https://toemdia.netlify.app`.

Seus 2 links:
- **Página de venda (para o anúncio):** `https://SEU-SITE.netlify.app`
- **Painel do administrador (só você):** `https://SEU-SITE.netlify.app/admin.html`

### 1.4 O painel do administrador
- Entra com o e-mail e a senha que você criou no Supabase.
- Mostra **nome, WhatsApp, data e hora** de cada cadastro, e de qual anúncio a pessoa veio.
- O botão **"Chamar no WhatsApp"** abre a conversa com a pessoa e a mensagem já escrita. Ele também marca a pessoa como "chamado", para você não chamar duas vezes.
- O botão **"Pagou?"** marca quem pagou a reserva. A tabela de cima mostra **quantos pagaram em cada versão**, que é o número que decide o teste.
- Os filtros **Novos / Chamados / Pagaram** organizam o dia.

### 1.5 Segurança (o que já está protegido)
- **Visitantes da página só conseguem se cadastrar.** Ninguém consegue ler, mudar ou apagar a lista, nem com conhecimento técnico.
- **Só a sua conta de admin vê os cadastros.** Outra conta que entrar no painel vê "Sem acesso".
- **Freio contra robôs:** no máximo 30 cadastros por minuto, um por número de WhatsApp, e um campo escondido que só robô preenche.
- **Nome com código malicioso aparece como texto** no painel e não é executado.
- **O painel não aparece no Google.**
- **Sua parte:** use uma senha forte, não passe a senha para ninguém e clique em **Sair** quando usar o painel num celular que não é seu.

> **Atenção:** no plano grátis, o Supabase pausa o projeto se ficar **7 dias sem nenhum acesso**. Com anúncio rodando isso não acontece. Se você parar os anúncios por mais de uma semana, entre no painel de vez em quando.

### 1.6 Teste antes de gastar
1. Faça um cadastro de teste no celular e veja se ele aparece no painel.
2. No Gerenciador de Eventos da Meta, confira se chegaram os eventos `PageView` e `Lead`.
3. Apague o cadastro de teste. Dá para fazer em **Supabase → Table Editor → leads**.

### Os 3 links (um para cada versão)

| Versão | Link |
|---|---|
| 1 · Medo | `SEU-LINK/?v=medo&utm_source=meta&utm_content=medo` |
| 2 · Calote | `SEU-LINK/?v=calote&utm_source=meta&utm_content=calote` |
| 3 · Áudio | `SEU-LINK/?v=audio&utm_source=meta&utm_content=audio` |

O painel mostra de qual versão veio cada pessoa e quantos pagaram em cada uma.

---

## 2. Campanha na Meta (Facebook e Instagram)

- **Objetivo:** Leads, otimizando o evento `Lead` do Pixel. A conversão acontece no site.
- **Estrutura:** 1 campanha com 3 conjuntos de anúncios, um por versão. Mesmo público e mesmo orçamento em todos, para a comparação ser justa.
- **Orçamento:** R$20 por dia em cada conjunto, por 7 dias. Dá **~R$420 no total**.
- **Público:** Brasil, de 22 a 55 anos, interesses em MEI, empreendedorismo, microempreendedor, Sebrae, salão de beleza, manicure e construção. Pode deixar o Advantage+ ampliar.
- **Posicionamentos:** Reels e Stories (vídeo vertical) primeiro. Feed como segunda opção.

### Cuidados para o anúncio não ser reprovado

- **Não afirme a situação financeira da pessoa.** A Meta proíbe anúncio que diga ou insinue atributos pessoais.
  - ❌ "Seu DAS está atrasado?"
  - ❌ "Você está devendo para a Receita?"
  - ✅ "Quem é MEI paga o DAS todo dia 20."
  - ✅ "Muita manicure esquece o DAS e só descobre depois."
- **Não use brasão, cores ou o nome "gov.br".** Nada que pareça governo. A página já avisa que não é serviço do governo.
- **Não prometa o que o app não faz.** Ele **lembra** do DAS. Ele **não paga** o DAS.

---

## 3. Textos dos anúncios

### Versão 1 · Medo (não perder o MEI)

**Texto principal:**
> Quem é MEI precisa pagar o DAS todo mês, até o dia 20, mesmo sem faturar nada.
> Mês sem DAS pago não conta para o INSS: auxílio-doença, salário-maternidade e aposentadoria.
> O Tô em Dia te lembra pelo WhatsApp, com o valor certo e o link oficial. Sem baixar aplicativo.
> 👉 Os 100 primeiros pagam R$14,90/mês para sempre.

**Título:** Seu MEI em dia pelo WhatsApp
**Botão:** Cadastre-se

### Versão 2 · Calote (cobrar sem vergonha)

**Texto principal:**
> Fez o serviço, o cliente disse "depois te pago"… e sumiu?
> O Tô em Dia prepara a mensagem de cobrança educada, com o seu Pix, e te avisa quem está atrasado.
> Você só aperta enviar. E ele ainda lembra do seu DAS antes do dia 20.
> 👉 Os 100 primeiros pagam R$14,90/mês para sempre.

**Título:** Receba sem passar vergonha
**Botão:** Cadastre-se

### Versão 3 · Áudio (organizar o dinheiro)

**Texto principal:**
> Recebeu? Manda um áudio: "recebi 150 da Dona Maria".
> O Tô em Dia anota, soma tudo e te mostra quanto você ganhou no mês. E ainda avisa quando você chegar perto do limite de R$81 mil do MEI.
> Tudo pelo WhatsApp. Nada de caderninho.
> 👉 Os 100 primeiros pagam R$14,90/mês para sempre.

**Título:** Seu dinheiro organizado por áudio
**Botão:** Cadastre-se

---

## 4. Roteiros de vídeo (15 a 25 segundos, celular na vertical)

Grave com gente de verdade, de preferência alguém do público: manicure, pedreiro, diarista. Vídeo simples feito no celular costuma vender mais que vídeo produzido.

### Vídeo 1 · Medo
1. **(0–3s)** Pessoa olhando o celular, preocupada. Texto na tela: *"Dia 20 de novo…"*
2. **(3–8s)** Fala: "Todo mês eu esquecia o DAS do meu MEI. E mês sem DAS não conta pro INSS."
3. **(8–16s)** Tela do WhatsApp com a mensagem: *"O seu DAS vence dia 20: R$ 86,05. Pagar no site oficial →"*. Fala: "Agora o Tô em Dia me avisa no WhatsApp antes de vencer."
4. **(16–22s)** Fala: "Os 100 primeiros pagam 14,90 pra sempre. Link aqui embaixo."

### Vídeo 2 · Calote
1. **(0–3s)** Texto na tela: *"Quando o cliente fala 'depois te pago'…"*. Rosto de "ah, tá".
2. **(3–9s)** Fala: "Eu tinha vergonha de cobrar. Ficava esperando, e o dinheiro não vinha."
3. **(9–17s)** Tela: o Tô em Dia mostra *"A Joana te deve R$ 80"* e a mensagem pronta com o Pix. A pessoa aperta enviar.
4. **(17–23s)** Fala: "Mensagem educada, com meu Pix, em um toque. Entra na lista, link aqui."

### Vídeo 3 · Áudio
1. **(0–3s)** Pessoa segurando um caderninho bagunçado. Texto: *"Quanto eu ganhei esse mês? 🤔"*
2. **(3–9s)** A pessoa grava um áudio no WhatsApp: "Recebi 150 da Dona Maria."
3. **(9–16s)** Tela: *"Anotado! Em outubro você já ganhou R$ 3.420."*
4. **(16–22s)** Fala: "Joguei o caderninho fora. Entra na lista e garante 14,90 por mês."

---

## 5. Os números que importam

Acompanhe no painel do administrador e no Gerenciador de Anúncios:

| Métrica | Bom | Ruim |
|---|---|---|
| Custo por cadastro (Lead) | até R$4 | acima de R$10 |
| % que marca "Sim, tenho DAS atrasado" ou "Não sei" | acima de 30% | abaixo de 10% |
| % de cadastrados que **pagam** a reserva (passo 6) | acima de 5% | abaixo de 2% |

### Regras de decisão (no 7º dia)
- **A versão vencedora** é a que teve o menor custo por cadastro **e** mais gente pagando a reserva.
- **Se nenhuma versão passar de 2% pagando:** a dor existe, mas talvez não por esse preço. Teste R$9,90 ou mude a oferta antes de construir.
- **Se a vencedora passar de 5% pagando:** sinal verde. A gente constrói o app (4 a 5 semanas), e quem pagou vira os primeiros usuários.

---

## 6. Pré-venda pelo WhatsApp (a validação de verdade)

Cadastro é fácil. **Pagar** é o que prova que o negócio funciona. Chame os cadastrados no mesmo dia (cadastro esfria rápido):

> Oi, [nome]! Aqui é do Tô em Dia 😊 Vi que você entrou na lista.
> Você é um dos primeiros, então garante o preço de fundador: **R$14,90 por mês, para sempre** (o preço normal vai ser R$29,90).
> Para reservar, é só pagar o 1º mês por Pix. Se a gente não lançar até [data], devolvemos 100% do valor. Quer garantir?

Se a pessoa responder, pergunte também: **"O que mais te atrapalha hoje: lembrar do DAS, cobrar cliente ou saber quanto ganhou?"** Essas respostas valem ouro para construir o app certo.

> Para receber o Pix, use uma conta separada só para isso e anote cada pagamento. Antes de passar de algumas dezenas de pagamentos, converse com um contador sobre abrir o CNPJ certo para vender software.

---

## 7. Depois do teste

1. A gente fica com a chamada vencedora, e ela vira o anúncio principal e o topo da página.
2. Eu construo o app reaproveitando o Cóbralo: português, Pix, lembrete do DAS, controle por áudio e cobrança de clientes.
3. Os fundadores entram primeiro e dão feedback por 2 semanas.
4. Abre para todo mundo a R$29,90 (ou o preço que o teste indicar) e escala o tráfego.
