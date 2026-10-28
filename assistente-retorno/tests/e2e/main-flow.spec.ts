import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe.configure({ mode: "serial" });

test("fluxo principal: painel → reativação → campanha → mensagens → resultado → relatório", async ({ page }) => {
  // 1. Painel
  await login(page, "demo@belavida.test");
  await expect(page.getByRole("heading", { name: /Olá, Carla/ })).toBeVisible();
  await expect(page.getByText("Conta de demonstração — todos os clientes e resultados são fictícios.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Clientes cadastradas/ })).toContainText("42");

  // 2. Clientes demonstrativos
  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Clientes" }).click();
  await expect(page.getByRole("heading", { name: "Clientes", exact: true })).toBeVisible();
  await expect(page.getByText("42 clientes")).toBeVisible();
  await expect(page.getByText("Fictícia").first()).toBeVisible();

  // 3. Quem precisa de acompanhamento, com explicação
  await page.goto("/reativacao");
  await expect(page.getByText(/cliente\(s\) precisam de acompanhamento/)).toBeVisible();
  await expect(page.getByText(/O prazo de retorno configurado para/).first()).toBeVisible();
  const enabled = page.locator('input[name="c"]:not(:disabled)');
  expect(await enabled.count()).toBeGreaterThanOrEqual(3);
  for (let i = 0; i < 3; i++) await enabled.nth(i).check();
  await page.getByRole("button", { name: "Criar campanha com selecionadas" }).click();

  // 4. Criar campanha
  await expect(page).toHaveURL(/\/campanhas\/nova\?/);
  await expect(page.getByText("3 cliente(s) selecionada(s)")).toBeVisible();
  await page.getByLabel("Nome da campanha").fill("Teste E2E — retorno");
  await page.getByLabel("Tom da mensagem").selectOption("profissional");
  await page.getByRole("button", { name: "Criar campanha" }).click();
  await expect(page.getByText("Campanha criada")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Teste E2E — retorno/ })).toContainText("Rascunho");

  // 5. Gerar e revisar mensagens (modo demonstrativo, sem IA)
  await page.getByRole("button", { name: "Gerar mensagens (3)" }).click();
  await expect(page.getByText(/3 mensagem\(ns\) preparada\(s\) pelo modo demonstrativo/)).toBeVisible();
  const cards = page.getByTestId("contact-card");
  await expect(cards).toHaveCount(3);
  await expect(cards.first().getByText(/Sugerida pelo modo demonstrativo/)).toBeVisible();

  // edição manual com termo de risco gera aviso
  const first = cards.first();
  await first.locator("textarea").fill("Olá! Aqui é da equipe Salão Bela Vida. Temos 20% de desconto esta semana.");
  await first.getByRole("button", { name: "Salvar edição" }).click();
  await expect(first.getByText(/Menciona desconto/)).toBeVisible();
  await expect(first.getByText(/Editada manualmente/)).toBeVisible();
  // corrige e aprova
  await first
    .locator("textarea")
    .fill("Olá! Aqui é da equipe Salão Bela Vida. Faz um tempinho desde a sua última visita. Se quiser agendar, é só responder.");
  await first.getByRole("button", { name: "Aprovar mensagem" }).click();
  await expect(first.getByText(/Aprovada por Carla/)).toBeVisible();

  // aprovação em lote exige confirmação
  await page.getByRole("button", { name: "Aprovar revisadas (2)" }).click();
  await page.getByRole("button", { name: "Revisei e aprovo" }).click();
  await expect(page.getByText("2 mensagem(ns) aprovada(s).")).toBeVisible();

  // 6. Envio manual e resultados
  const card = cards.first();
  await expect(card.getByText("Contato fictício: abrir conversa desativado.")).toBeVisible();
  await card.getByRole("button", { name: "Registrar envio" }).click();
  await expect(card.getByText("Enviada, aguardando resposta")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Teste E2E — retorno/ })).toContainText("Em andamento");

  await card.getByLabel("O que aconteceu?").selectOption("returned");
  await card.getByLabel("Valor da venda (R$, opcional)").fill("150,00");
  await card.getByRole("button", { name: "Registrar resultado" }).click();
  await expect(card.getByText("Atribuído à campanha")).toBeVisible();
  await expect(card.getByText("valor informado manualmente")).toBeVisible();

  // segundo contato: envio + agendamento
  const second = cards.nth(1);
  await second.getByRole("button", { name: "Registrar envio" }).click();
  await expect(second.getByText("Enviada, aguardando resposta")).toBeVisible();
  await second.getByLabel("O que aconteceu?").selectOption("scheduled");
  await second.getByRole("button", { name: "Registrar resultado" }).click();
  await expect(second.getByText("Agendou", { exact: true })).toBeVisible();

  // 7. Relatório
  await page.goto("/relatorios");
  const row = page.getByRole("row", { name: /Teste E2E — retorno/ });
  await expect(row).toContainText("R$ 150,00");
  await expect(row).toContainText("50,0% (1 ÷ 2)"); // retorno atribuído = 1 de 2 enviadas
  await expect(page.getByText(/Fórmula: respostas ÷ mensagens enviadas/)).toBeVisible();
  await expect(page.getByText(/Amostra pequena/).first()).toBeVisible();

  // Painel reflete o retorno (2 fictícios + 1 deste teste)
  await page.goto("/painel");
  await expect(page.getByRole("link", { name: /Clientes que retornaram/ })).toContainText("3");
});

test("importação CSV: prévia, duplicidades, erros e confirmação de consentimento", async ({ page }) => {
  await login(page, "demo@belavida.test");
  await page.goto("/clientes/importar");
  await page.getByLabel("Selecione o arquivo CSV").setInputFiles("public/modelo-importacao.csv");
  await expect(page.getByText("Relacione as colunas da planilha")).toBeVisible();
  await page.getByRole("button", { name: "Validar dados" }).click();
  await expect(page.getByText("3 serão importadas")).toBeVisible();
  await expect(page.getByText("1 com erro (ignoradas)")).toBeVisible();
  await expect(page.getByText("1 possíveis duplicidades (ignoradas)")).toBeVisible();
  const importBtn = page.getByRole("button", { name: "Importar 3 cliente(s)" });
  await expect(importBtn).toBeDisabled(); // exige confirmar a autorização
  await page.getByLabel(/Confirmo que as autorizações da planilha/).check();
  await importBtn.click();
  await expect(page.getByText(/3 cliente\(s\) cadastrada\(s\).*Nenhuma mensagem foi enviada/)).toBeVisible();

  // reimportar o mesmo arquivo: agora são duplicidades de clientes existentes
  await page.getByRole("button", { name: "Importar outro arquivo" }).click();
  await page.getByLabel("Selecione o arquivo CSV").setInputFiles("public/modelo-importacao.csv");
  await page.getByRole("button", { name: "Validar dados" }).click();
  await expect(page.getByText("0 serão importadas")).toBeVisible();
  await page.getByRole("button", { name: "Cancelar importação" }).click();
  await expect(page.getByLabel("Selecione o arquivo CSV")).toBeVisible();
});

test("cadastro manual de cliente com validação e pedido de oposição", async ({ page }) => {
  await login(page, "demo@belavida.test");
  await page.goto("/clientes/novo");
  await page.getByRole("textbox", { name: /^Nome/ }).fill("Cliente Teste Validação");
  await page.getByLabel("Telefone (WhatsApp)").fill("1234");
  await page.getByRole("button", { name: "Cadastrar cliente" }).click();
  await expect(page.getByText(/Telefone: informe DDD \+ número/)).toBeVisible();
  // o que foi digitado não se perde após erro
  await expect(page.getByRole("textbox", { name: /^Nome/ })).toHaveValue("Cliente Teste Validação");
  await page.getByLabel("Telefone (WhatsApp)").fill("(31) 99876-5432");
  await page.getByLabel("A cliente autorizou receber mensagens?").selectOption("granted");
  await page.getByRole("button", { name: "Cadastrar cliente" }).click();
  await expect(page.getByText("Cliente cadastrada.")).toBeVisible();
  await expect(page.getByText("(31) 99876-5432").first()).toBeVisible();

  await page.getByRole("button", { name: "Registrar pedido" }).click();
  await expect(page.getByText(/não será incluída em novas campanhas/)).toBeVisible();
});
