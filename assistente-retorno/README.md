# Assistente de Retorno — protótipo

> Ajude seu salão a recuperar clientes e organizar seu relacionamento com elas, sem precisar controlar tudo manualmente.

Protótipo funcional de um SaaS B2B para salões de beleza no Brasil. Serve para **demonstrar o produto a proprietários de salões e validar se pagariam por ele**.

**Este protótipo não está pronto para receber dados reais de clientes.** Veja [Limitações](#limitações-conhecidas) e [O que falta para produção](#o-que-falta-para-produção).

---

## Como executar

Requisitos: **Node.js 22.13 ou superior** (o banco usa o módulo embutido `node:sqlite`). Não há banco externo nem Docker.

```bash
cd assistente-retorno
npm install
npm run dev          # http://localhost:3000
```

Na primeira execução o banco é criado em `./data/assistente.db`, com **contas e dados fictícios**:

| E-mail | Papel | Senha |
|---|---|---|
| `demo@belavida.test` | Proprietária do "Salão Bela Vida" (42 clientes fictícias + 1 campanha fictícia concluída) | `demo12345` |
| `equipe@belavida.test` | Equipe (recepção) do mesmo salão — sem acesso a exportação/exclusão | `demo12345` |
| `aurora@studio.test` | Outro salão ("Studio Aurora"), para demonstrar o isolamento entre empresas | `demo12345` |

Outros comandos:

```bash
npm run build && npm start   # modo produção (cookies com flag Secure: use HTTPS ou INSECURE_COOKIES=true só para teste local)
npm run typecheck            # TypeScript
npm test                     # testes unitários (Vitest)
npm run test:e2e             # build + testes de ponta a ponta (Playwright/Chromium)
npm run db:reset             # apaga o banco local; ele é recriado no próximo start
```

O Node exibe `ExperimentalWarning: SQLite is an experimental feature` ao iniciar. É esperado e não afeta o funcionamento.

Configuração por variáveis de ambiente: veja [`.env.example`](.env.example).

### Roteiro de demonstração (≈ 5 minutos)

1. Entre com `demo@belavida.test`. O **Painel** mostra totais e resultados atribuídos (fictícios, sinalizados no topo).
2. **Clientes**: lista com busca, autorização para mensagens e histórico de visitas.
3. **Reativação**: quem passou do prazo de retorno *do serviço* (coloração 45 dias, progressiva 120 dias…), com a explicação de cada caso. Marque algumas clientes e clique em **Criar campanha com selecionadas**.
4. **Nova campanha**: defina tom, objetivo e serviço e crie a campanha.
5. Na campanha: **Gerar mensagens**, revise e edite (termos como "desconto" geram alerta), **Aprove**, **Copie** o texto e **Registre o envio**.
6. Registre o resultado: resposta, agendamento ou **retorno com valor da venda**.
7. **Relatórios**: taxas com fórmula e denominador, separação entre receita manual e via integração, e aviso de amostra pequena.

---

## Arquitetura

| Camada | Escolha | Por quê |
|---|---|---|
| Aplicação | **Next.js 16 (App Router) + React 19 + TypeScript** | Frontend e backend no mesmo projeto; Server Components e Server Actions rodam só no servidor, então a regra de negócio e os segredos não vão para o navegador. Caminho direto para Vercel ou qualquer Node. |
| Banco | **SQLite via `node:sqlite`** (embutido no Node 22) | Zero instalação para demonstrar. O ambiente de desenvolvimento não permitia baixar binários nativos. O SQL é portável para **Postgres**, o banco recomendado para produção. |
| Estilo | Tailwind CSS v4, componentes próprios, ícones `lucide-react` | Interface consistente sem dependência de kit de UI. |
| Validação | Zod (no servidor) | Toda entrada é validada no servidor, inclusive o que vem do assistente de importação. |
| IA | SDK oficial `@anthropic-ai/sdk`, chamado **só no servidor** | Ativada apenas se `ANTHROPIC_API_KEY` existir; sem a chave, entra o **modo demonstrativo** (modelos de texto fixos), identificado em todas as telas. |
| Testes | Vitest (domínio + repositórios com banco em memória) e Playwright (fluxos E2E) | |

Estrutura:

```
src/
  app/(auth)/            login, cadastro, ações de sessão
  app/(app)/             telas autenticadas: painel, clientes, reativacao, campanhas, relatorios, configuracoes
  app/api/               exportação de dados (JSON) da empresa e de uma cliente
  lib/db/                conexão, schema SQL, dados fictícios (seed)
  lib/auth/              senha (scrypt), sessão (cookie httpOnly), limite de tentativas
  lib/repos/             acesso a dados — TODA função recebe o contexto da empresa (tenantId)
  lib/domain/            regras puras: reativação, atribuição, relatórios, CSV, telefone, datas
  lib/ai/                gerador de mensagens (Anthropic | demonstrativo) + verificações de risco
  lib/channels/          canais de envio (manual) e ponto de extensão do WhatsApp oficial
  lib/plans.ts           planos, preços hipotéticos e limites
tests/unit, tests/e2e
```

### Segurança e isolamento entre empresas

- **Autenticação**: senha com scrypt e sal; sessão com token aleatório de 256 bits. O banco guarda só o hash SHA-256 do token. Cookie `httpOnly`, `SameSite=Lax` e `Secure` em produção. Há limite de tentativas de login (em memória).
- **Autorização no servidor**: cada página, Server Action e rota de API resolve a sessão no servidor (`requireContext`). O `tenantId` **nunca vem do navegador**.
- **Isolamento**: toda consulta da camada `lib/repos` filtra por `tenant_id`. Referências cruzadas (cliente→campanha, serviço→visita) são verificadas dentro do mesmo tenant. Os testes unitários e E2E tentam ler, alterar e exportar dados de outro salão e esperam "não encontrado".
- **Papéis**: `owner` (configurações, exportação, exclusão) e `staff` (operação do dia a dia).
- **Segredos**: só em variáveis de ambiente do servidor. Nada com prefixo `NEXT_PUBLIC_`.
- **Proteções do Next.js**: Server Actions verificam a origem (proteção contra CSRF). Cabeçalhos `X-Frame-Options`, `nosniff`, `Referrer-Policy` e `Permissions-Policy`.
- **Registro de ações**: login, cadastro/edição/exclusão de clientes, importações, campanhas, aprovação em lote, exportações e mudanças de configuração ficam em `audit_log`, visível em Configurações. O registro evita guardar dados pessoais.

### LGPD (desde o início)

- **Finalidade e minimização**: só nome, telefone, visitas (serviço/data/valor) e observações. O formulário orienta a não registrar dados sensíveis.
- **Base legal e consentimento**: cada cliente tem "autorizou / não registrada / não autorizou", base legal e origem do contato. **Só clientes com autorização ativa entram em campanhas.** A regra vale no servidor, não só na tela.
- **Oposição**: o pedido para não receber mensagens fica registrado na cliente ou no resultado da campanha. Ele bloqueia novas campanhas e encerra contatos pendentes. As mensagens sugeridas incluem, por padrão, a frase de opção de saída.
- **Importação**: "autorizou" vindo da planilha só é gravado se o usuário confirmar que reflete consentimento real. Sem confirmação, o servidor grava "não registrada".
- **Direitos dos titulares**: exportar os dados de uma cliente (JSON) e excluí-la definitivamente, com todo o histórico.
- **Portabilidade e encerramento**: exportação completa da empresa e exclusão da conta, só pela proprietária.
- **Retenção**: prazo configurável (padrão 24 meses), com exclusão das clientes fora do prazo.
- **IA**: com IA ativa, são enviados ao provedor apenas o primeiro nome (opcional por campanha), o nome do serviço e o número de dias desde a última visita. Nada de telefone ou observações.

---

## Funcionalidades

### Implementadas e funcionais

- Cadastro de salão (multiempresa), login e logout, papéis owner e staff.
- **Painel**: clientes cadastradas, quem precisa de acompanhamento, mensagens preparadas e aguardando aprovação, campanhas em andamento, retornos, agendamentos e receita atribuídos. Mostra "Sem dados suficientes" quando não há base.
- **Clientes**: cadastro e edição com validação (telefone brasileiro normalizado, datas, duplicidade por telefone); histórico de visitas; próxima visita; origem; base legal; autorização; pedido de oposição; exportação e exclusão.
- **Importação CSV**: separador `,` `;` ou tab; UTF-8 ou Windows-1252 (Excel); sugestão e ajuste do mapeamento de colunas; prévia com erros, avisos e duplicidades (no arquivo e já cadastradas); cancelamento a qualquer momento; revalidação no servidor; **nenhuma mensagem disparada**. Modelo de exemplo em `/modelo-importacao.csv`.
- **Reativação**: prazo de retorno **por serviço** (configurável) com prazo padrão do salão; filtros por tempo sem visita, serviço, período da última visita, status de contato e autorização; explicação em texto de cada cliente; seleção direta para campanha.
- **Gerador de mensagens**: tom, objetivo, serviço, nome do salão e uso opcional do nome da cliente; "informações adicionais" como única fonte de fatos extras; alertas automáticos para promessas não registradas (desconto, preço, percentual, brinde, vagas/horários, datas, urgência); identificação da origem do texto (IA, modo demonstrativo ou edição manual).
- **Campanhas**: criação, configuração, seleção de clientes elegíveis, geração, edição, aprovação individual, aprovação em lote com confirmação, envio **manual** (copiar texto ou abrir conversa no WhatsApp via link oficial `wa.me`; desativado para contatos fictícios), registro do envio, resultados (respondeu, agendou com data, retornou com serviço e valor, sem resposta, sem interesse, pediu para não receber), histórico de eventos, concluir e excluir (só sem envios).
- **Atribuição explícita**: o retorno só conta para a campanha se for registrado no contato, **depois do envio e dentro da janela da campanha** (padrão 30 dias). Nada é atribuído automaticamente.
- **Relatórios**: taxas de resposta, agendamento e retorno com **fórmula e denominador visíveis**; aviso de amostra pequena (n < 20); receita separada por origem (manual × integração); funil; desempenho por campanha.
- **Configurações**: dados do salão, serviços e prazos, plano (simulação), status das integrações, LGPD (exportar, retenção, dados demonstrativos, excluir conta) e registro de ações.
- Estados de carregamento, erro, vazio e sucesso; confirmação antes de ações importantes; layout responsivo (menu lateral no desktop, gaveta no celular); rótulos e foco acessíveis.

### Demonstrativas, simuladas ou não implementadas

| Item | Situação |
|---|---|
| Clientes, visitas e a campanha "Exemplo fictício" | **Fictícios**, marcados com "Fictícia" em todas as telas. Os resultados dessa campanha são inventados. |
| Geração por IA | Funciona com `ANTHROPIC_API_KEY`. **Não foi testada contra a API real neste ambiente** (sem chave); o código compila e trata erros e recusas. Sem chave, o modo demonstrativo usa modelos de texto fixos. |
| Envio de mensagens | **Sempre manual.** Não há disparo automático nem em massa. |
| WhatsApp Business Platform | **Não implementado.** Só há o ponto de extensão documentado em `src/lib/channels/whatsapp-cloud.ts`. |
| Planos e preços | Hipóteses configuráveis em `src/lib/plans.ts`. Os limites (clientes, campanhas simultâneas, mensagens com IA) são aplicados, mas **não há cobrança**. |
| Dados "via integração" | O modelo já separa `manual` × `integration`, mas nenhuma integração grava dados ainda. |
| Convite de usuários da equipe | Não implementado (as contas de equipe existem só no seed). |
| Recuperação de senha, verificação de e-mail, 2FA | Não implementados. |

---

## Testes

Executados neste ambiente:

- `npm test`: **52 testes unitários passando**. Cobrem telefone, datas, valores, CSV, mapeamento e validação da importação, regras de reativação, atribuição, cálculo de taxas, alertas de mensagem e textos do modo demonstrativo, além de testes de repositório com banco em memória: isolamento entre empresas, permissões por papel, regras do fluxo de campanha (consentimento, aprovação antes do envio, resultado só após envio, datas, oposição, limites do plano) e importação.
- `npm run test:e2e`: **7 testes de ponta a ponta passando** no Chromium. Cobrem o fluxo principal completo (painel → clientes → reativação → campanha → gerar/editar/aprovar → envio → resultado → relatório → painel), a importação CSV com erros, duplicidades e confirmação de consentimento, o cadastro com validação e oposição, o acesso sem sessão, o isolamento entre salões, as restrições do perfil de equipe e a exportação restrita à própria empresa.

Não testado: chamada real à API de IA (falta chave), navegadores além do Chromium, carga e concorrência.

---

## O que falta para produção

### Credenciais, serviços e integrações necessários

| Necessidade | Para quê | Variáveis / ação |
|---|---|---|
| **Banco Postgres gerenciado** (ex.: Neon, Supabase, RDS) | Substituir o SQLite; backups, réplicas e criptografia em repouso | `DATABASE_URL`; adaptar `src/lib/db` (o SQL já é quase compatível) e adicionar **Row Level Security** por `tenant_id` como segunda barreira |
| **Hospedagem com HTTPS** (ex.: Vercel, Render, Fly) | Servir a aplicação | Domínio + certificado |
| **Chave da API Anthropic** | Mensagens sugeridas por IA | `ANTHROPIC_API_KEY` (opcional `ANTHROPIC_MODEL`); contrato e DPA com o provedor (LGPD) |
| **Meta / WhatsApp Business Platform** | Envio oficial e recebimento de respostas | Conta Meta Business verificada, número aprovado, **modelos de mensagem aprovados**, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET` (assinatura do webhook) |
| **Provedor de pagamentos** (ex.: Stripe, Pagar.me, Asaas, Mercado Pago) | Cobrança recorrente da assinatura | Chaves secretas + webhook |
| **E-mail transacional** (ex.: Resend, SES) | Recuperação de senha, convites, verificação de e-mail | Chave do provedor + domínio verificado |
| **Armazenamento compartilhado** (ex.: Redis) | Limite de tentativas de login entre instâncias | `REDIS_URL` |
| **Monitoramento de erros e logs** (ex.: Sentry) | Operação | DSN |

### Trabalho de produto e engenharia antes de dados reais

1. Migrar para Postgres com migrações versionadas e RLS; desativar `SEED_DEMO`.
2. Recuperação de senha, verificação de e-mail, convite de equipe e, de preferência, 2FA para proprietários.
3. Política de privacidade, termos de uso, contrato de operador de dados (o salão é o controlador; o SaaS, operador), registro das operações de tratamento e canal do encarregado (DPO).
4. Integração oficial com o WhatsApp: modelos aprovados, opt-in, janela de 24h, webhooks gravando eventos com `data_source = 'integration'`.
5. Paginação e cálculo de reativação em SQL para bases grandes (hoje é feito em memória por salão, adequado a poucos milhares de clientes).
6. Backups, retenção automática agendada, testes de carga e revisão de segurança independente.

## Limitações conhecidas

- SQLite em arquivo local: um único processo, sem alta disponibilidade. É adequado só para demonstração.
- Datas calculadas no fuso de São Paulo; não há suporte a vários fusos por salão.
- O limite de tentativas de login vive na memória do processo.
- Correlação não é causalidade: os relatórios mostram o que foi registrado, não provam que a mensagem causou o retorno. Não há grupo de controle.
- Nenhum resultado financeiro é prometido aos salões; os preços dos planos são hipóteses para validação.
