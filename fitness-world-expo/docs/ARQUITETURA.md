# Arquitetura — FITNESS WORLD EXPO

## Visão geral

```
┌──────────────────────────── Navegador ────────────────────────────┐
│  Site / Painéis (React)        Pavilhão 3D (Three.js + HUD React) │
│        │                                │                         │
│        ▼                                ▼                         │
│  repositories.ts (escopo por perfil)   ExpoEngine ◄── syncState() │
│        │                                │                         │
│        ▼                                ▼                         │
│  store.ts  ◄────────────── estado único (ExpoState) ──────────────┤
│        │                                                          │
│  services/                                                        │
│   ├─ commerce  → PaymentProvider · OrderRouter   (simulados)      │
│   ├─ realtime  → RealtimeTransport               (local)          │
│   └─ voice     → VoiceCall (WebRTC)              (real)           │
└───────────────────────────────────────────────────────────────────┘
```

O ambiente 3D é **gerado a partir dos dados**: cada estande é construído por `buildBooth()` com a
configuração salva pela marca (arquitetura, cores, iluminação, piso, decoração, logotipo, telão,
vitrines, balcões, produtos e vendedores). Quando o estado muda, `ExpoEngine.syncState()` reconstrói
apenas os estandes cuja assinatura mudou — é assim que uma alteração no painel aparece ao vivo no pavilhão.

## Pontos de integração (o que trocar para produção)

| Contrato | Implementação atual | Produção sugerida |
|---|---|---|
| `store.ts` + `repositories.ts` | localStorage, escopo aplicado no cliente | API própria ou Supabase/PostgreSQL com RLS (`docs/schema.sql`). As telas não mudam: trocar o corpo das funções do repositório por chamadas à API. |
| `services/auth.ts` | escolha de conta sem senha | Supabase Auth / Auth0 / Cognito; papéis `admin`, `brand_member`, `seller`, `visitor` em claims do JWT. |
| `RealtimeTransport` | `LocalBroadcastTransport` (abas do mesmo navegador) | Servidor de estado de sala (Colyseus, Socket.IO, Nakama) ou data channels do LiveKit. Particionar por pavilhão/área e enviar pose a 10 Hz com interpolação (já implementada no motor). |
| `VoiceCall` | WebRTC P2P, sem ICE servers | STUN/TURN (coturn ou serviço gerenciado) para P2P pela internet, ou SFU gerenciada (LiveKit, Agora, Daily, Twilio) para escala, gravação opcional e moderação. A interface de chamada (estados, níveis, mute, chat) permanece. |
| `PaymentProvider` | `simulatedPayment` | Gateway com split por marca (Pagar.me, Mercado Pago, Stripe Connect). A comissão da plataforma já é calculada e congelada em cada pedido (`commissionRate`, `commissionValue`). |
| `OrderRouter` | `localOrderRouter` (painel da marca) | Webhook assinado para o sistema da marca ou conectores (VTEX, Shopify, Nuvemshop, Bling/Tiny). |
| Analytics (`track`) | eventos no estado local | Coleta no servidor (eventos já tipados: `sessao`, `visita_estande`, `produto_visto`, `chamada_solicitada`, `chamada_conectada`, `carrinho_adicionado`, `pedido`). |
| Mídia das marcas | dataURL redimensionado | Storage (S3/Supabase Storage) + CDN; modelos GLB por produto; vídeo no telão via HLS. |

## Multiusuário — protocolo

Mensagens do transporte (`services/realtime/transport.ts`):

- `presence` — `{ peerId, role, name, brandId?, sellerId?, avatar, x, z, ry, moving, talking, inCallWith }` a cada 100 ms quando há movimento, 1 s parado; expira em 4 s.
- `signal` endereçado — `call-request`, `call-accept`, `call-decline`, `call-cancel`, `call-end`, `offer`, `answer`, `ice`, `chat`.

O status **online** de um vendedor no pavilhão é derivado exclusivamente da presença real
(uma pessoa conectada no modo vendedor). O horário de plantão cadastrado é exibido como
informação, nunca usado para fingir disponibilidade. Não há atendimento automatizado por IA.

## Temporadas

`services/season.ts` calcula a fase (`em_breve`, `aberta`, `fechada_hoje`, `encerrada`) a partir
das datas e do horário diário. Fora do horário o pavilhão permanece navegável como visita prévia,
com aviso; a página inicial mostra contagem regressiva ou a próxima edição.

## Monetização

Configurável em **Administração → Monetização** e refletida nos cálculos de receita:

1. Participação por temporada (planos standard, premium, master).
2. Estandes premium (arquitetura mezanino, 2 balcões e posições de maior fluxo liberados por plano).
3. Patrocínios oficiais (cotas diamante, ouro, prata; o diamante nomeia o Palco Principal).
4. Comissão sobre vendas (padrão + valor negociado por marca, congelado no pedido).
5. Publicidade no ambiente (telões suspensos, telão do palco nos intervalos, totem do lobby, banners de corredor), cobrada por dia.

## Desempenho

- Qualidade automática: celulares/tablets usam "baixa" (sem bloom, sem luzes por estande, pixel ratio 1).
- Telões atualizados em rodízio (~10 fps cada, poucos por quadro).
- Treliça, luminárias e cadeiras com `InstancedMesh`.
- Produtos ocultados por distância (LOD simples por estande).
- Texturas geradas em canvas — nenhum arquivo de imagem externo é necessário.

Próximos passos de desempenho para produção: merge de geometrias estáticas por material,
KTX2/Basis para texturas, e particionamento do pavilhão em áreas carregadas sob demanda.
