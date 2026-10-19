# ⚡🎓 Reta Final ENEM

Web app (PWA) de revisão para o ENEM 2026, feito para o celular.
React + Vite + Tailwind CSS · sem backend (tudo salvo no `localStorage`).

---

## 📱 Como abrir e ver o app (passo a passo simples)

### Opção 1 – Mais fácil: link de pré-visualização
Abra o link de pré-visualização que o Claude te mandou no chat, direto no celular. Pronto.
> Nessa pré-visualização tudo funciona, só não dá para "instalar" na tela inicial.

### Opção 2 – Site de verdade, de graça, no GitHub Pages (com instalação na tela inicial)
1. Junte (merge) esta branch na `main` do repositório.
2. No GitHub, abra o repositório → **Settings** → **Pages**.
3. Em **Source**, escolha **GitHub Actions**.
4. Espere uns 2 minutos (aba **Actions** fica verde ✅).
5. O endereço aparece em **Settings → Pages** (algo como `https://SEU-USUARIO.github.io/nutricionista-app/`).
6. Abra no celular. Para instalar: Android (Chrome) → menu ⋮ → **Instalar app**; iPhone (Safari) → botão compartilhar → **Adicionar à Tela de Início**.

> Se o repositório for privado e sua conta for gratuita, o GitHub Pages não funciona. Use a Opção 3.

### Opção 3 – Netlify Drop (arrastar e soltar, sem conta técnica)
1. No computador, dentro da pasta `reta-final-enem`, rode `npm install` e depois `npm run build`.
2. Acesse **https://app.netlify.com/drop** e arraste a pasta **`dist`** para a página.
3. Ele te dá um link na hora. Abra no celular.

### Opção 4 – No seu computador
```bash
cd reta-final-enem
npm install
npm run dev
```
Abra o endereço que aparecer (ex.: `http://localhost:5173`). Para ver no celular, conecte no mesmo Wi-Fi e use o endereço "Network" que o terminal mostra.

---

## 🧪 Modo teste (ver tudo liberado)
Toque **5 vezes seguidas no logo** (em cima, à esquerda). Aparece o aviso "Modo teste LIGADO" e o selo **TESTE** no logo.
Toque 5 vezes de novo (ou use o botão no Perfil) para desligar.

---

## ✏️ Onde editar o conteúdo
Tudo fica em `src/data/`:

| Arquivo | O que tem |
|---|---|
| `questoes/linguagens.js`, `humanas.js`, `natureza.js`, `matematica.js` | 20 questões por área (gabarito em `correta`: 0=A … 4=E) |
| `resumos.js` | 20 resumos (5 por área) com macete |
| `flashcards.js` | 40 flashcards |
| `redacao.js` | Competências, estrutura, 8 temas e checklist |
| `plano21.js` | Plano de revisão de 21 dias |
| `planos.js` | Preços, planos e limites do plano grátis |
| `ebooks.js` | E-books, preços e cores das capas |
| `landing.js` | Depoimentos (**EXEMPLO – troque!**) e perguntas frequentes |
| `diaProva.js` | Checklist e dicas do dia da prova |
| `config.js` | WhatsApp de suporte e datas do ENEM |

## 💳 Ligar o pagamento depois
Tudo passa por **um único arquivo**: `src/lib/checkout.js`.
Troque o corpo da função `processarPagamento(pedido, usuario)` para chamar seu gateway (Mercado Pago, Asaas, Stripe...).
Quando o pagamento for aprovado, retorne `{ status: 'aprovado' }` (o app libera o plano/e-books) ou
`{ status: 'pendente', linkPagamento }` para redirecionar ao link de pagamento.
Hoje ela retorna `{ status: 'em_breve' }`, e a janela mostra "Pagamento em breve (Pix e cartão)" + botão para garantir pelo WhatsApp.

> ⚠️ Sem backend, a liberação fica salva só no aparelho. Para venda real, o ideal é confirmar o pagamento num servidor (webhook do gateway).

## 📈 Pixel do Meta
No `index.html` há um bloco comentado com as instruções: troque `SEU_PIXEL_ID` e apague as marcações de comentário.
Eventos já ligados no código (`src/lib/pixel.js`): **Lead** (ao entrar) e **InitiateCheckout** (ao abrir qualquer compra).

## 🛠️ Comandos
- `npm run dev` – modo desenvolvimento
- `npm run build` – gera o site em `dist/` (com PWA)
- `npm run build:preview` – gera um único arquivo `dist-preview/index.html` para pré-visualização
- `npm run icons` – regenera os ícones PNG a partir do SVG (precisa do Playwright)

Não somos afiliados ao INEP/MEC.
