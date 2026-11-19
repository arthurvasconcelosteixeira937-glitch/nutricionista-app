# FITNESS WORLD EXPO — MVP

Feira comercial virtual em 3D para o mercado de suplementação, nutrição esportiva e fitness.
O visitante entra em um centro de convenções 3D, caminha em primeira pessoa pelos corredores,
visita estandes de marcas, conversa por voz com **vendedores humanos** e compra produtos.

> Todas as marcas, produtos, pessoas e patrocinadores do protótipo são **fictícios**.
> Marcas reais (ex.: Growth Supplements, Integralmedica, Max Titanium, Dux Nutrition) só devem
> entrar com autorização formal e usando seus próprios ativos de identidade.

## Como rodar

```bash
cd fitness-world-expo
npm install
npm run dev        # http://localhost:5173
npm run build      # gera dist/ (site estático, pode ser publicado em qualquer hospedagem)
```

Requisitos: Node 20+ e um navegador com WebGL (Chrome, Edge, Safari, Firefox).
Microfone exige HTTPS ou `localhost`.

## O que tem no MVP

| # | Prioridade | Onde |
|---|---|---|
| 1 | Tela inicial da feira (status da temporada, contagem regressiva, planta, expositores, planos) | `/` |
| 2 | Entrada no ambiente 3D (portão de entrada, identificação do visitante, visita prévia fora do horário) | `/feira` |
| 3 | Movimentação em primeira pessoa — WASD/setas + mouse (Pointer Lock); joystick e arrastar no celular | `/feira` |
| 4 | Pavilhão: lobby com arco e credenciamento, boulevard, corredores, sinalização suspensa, totens, treliça, telões de LED, arena de lançamentos e Palco Principal com plateia | `/feira` |
| 5 | 8 estandes demonstrativos em 4 arquiteturas (ilha, península, portal, mezanino) | `/feira` |
| 6 | Vitrines com produtos 3D clicáveis, ficha do produto, catálogo do estande | `/feira` |
| 7 | Atendimento por voz com vendedor humano (WebRTC, microfone real) + chat de texto | `/feira` |
| 8 | Carrinho e checkout — um pedido por marca, pagamento **simulado** | `/carrinho` |
| 9 | Painel da empresa: estande com prévia 3D ao vivo, produtos, vendedores com editor de avatar e horários, visitantes, vendas, resultados | `/empresa` |
| 10 | Painel administrativo: temporadas, aprovação de empresas, estandes, horários e eventos, patrocinadores, vendas, monetização, métricas | `/admin` |

Também: programação da temporada e próxima edição (`/programacao`), inscrição de marcas (`/expor`)
e a página de transparência **Status das integrações** (`/status`).

## Roteiro de demonstração (5 minutos)

1. Abra `/` e clique em **Entrar no pavilhão 3D**. Caminhe até um estande, clique em um produto e adicione ao carrinho.
2. Em outra aba, abra **Painel da empresa** → entre como *IRONCORE Nutrition* → **Vendedores** → **Entrar na feira como vendedor**.
3. Volte à aba do visitante: o avatar de *Rafael Moreira* fica **online**. Aproxime-se e clique em **Iniciar conversa**.
   Permita o microfone e atenda na aba do vendedor. Use fones de ouvido para evitar microfonia.
4. No painel da empresa → **Estande**, troque cores, arquitetura ou o título do telão e clique em **Salvar e publicar**:
   o pavilhão aberto na outra aba se atualiza na hora.
5. Finalize a compra em `/carrinho`. O pedido aparece em **Painel da empresa → Vendas** (somente para a marca dona do pedido)
   e em **Administração → Vendas**, com a comissão calculada.
6. Em **Administração**, use **Gerar dados de demonstração** para preencher gráficos (os registros ficam marcados como `demo`).

## O que é real, local, simulado ou pendente

| Recurso | Status |
|---|---|
| Ambiente 3D, navegação, interação, personalização de estandes e avatares | Funcional |
| Voz: microfone, permissões, áudio WebRTC visitante ↔ vendedor | Funcional |
| Presença multiusuário e sinalização da chamada | Funcional **somente entre abas do mesmo navegador** (BroadcastChannel) |
| Voz e presença pela internet (servidor de tempo real, STUN/TURN, SFU) | **Não implementado** |
| Persistência de dados | Local (localStorage do navegador) |
| Login de empresas e administrador | Simulado (sem senha). Isolamento por empresa aplicado na camada de dados |
| Pagamento, frete, CEP | Simulado — nenhuma cobrança |
| Envio do pedido ao sistema da marca, cobrança das marcas/patrocinadores, nota fiscal | **Não implementado** |
| Métricas de visitantes | Eventos reais registrados neste navegador; analytics centralizado pendente |

A mesma tabela está dentro do app em `/status`, e cada tela marca o que é simulado ou pendente.

## Estrutura

```
src/
  domain/types.ts          modelo de domínio (marcas, estandes, produtos, vendedores, temporadas, pedidos…)
  data/seed.ts             dados demonstrativos (fictícios)
  data/store.ts            estado + persistência local + sincronização entre abas
  data/repositories.ts     acesso a dados com escopo por perfil (empresa só acessa os próprios dados)
  services/auth.ts         sessão demonstrativa (admin / empresa) e identidade do visitante
  services/season.ts       regras de temporada (aberta, fechada, em breve, encerrada) e plantões
  services/commerce/       carrinho, contratos PaymentProvider/OrderRouter e implementações simuladas
  services/realtime/       contrato RealtimeTransport + implementação local (BroadcastChannel)
  services/voice/          chamada de voz WebRTC (microfone, sinalização, níveis de áudio)
  expo/engine/             motor 3D (Three.js): pavilhão, estandes, produtos, avatares, telões, controles
  expo/ExpoPage.tsx        experiência 3D + HUD (diretório, catálogo, carrinho, chamada de voz)
  pages/                   site, checkout, programação, painel da empresa, painel administrativo
docs/
  ARQUITETURA.md           arquitetura e plano de integrações
  schema.sql               esquema de banco de produção (PostgreSQL) com regras de acesso por empresa
```

Stack: React 18 + TypeScript + Vite, Three.js (WebGL, pós-processamento com bloom), Tailwind CSS, React Router (hash).
