import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("sem sessão: páginas redirecionam e API recusa", async ({ page, request }) => {
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/login/);
  const res = await request.get("/api/exportar");
  expect(res.status()).toBe(401);
});

test("isolamento entre empresas: outro salão não acessa cliente nem exportação", async ({ browser }) => {
  const a = await browser.newContext();
  const pageA = await a.newPage();
  await login(pageA, "demo@belavida.test");
  await pageA.goto("/clientes");
  const href = await pageA.locator("tbody a[href^='/clientes/']").first().getAttribute("href");
  expect(href).toMatch(/^\/clientes\/[0-9a-f-]{36}$/);
  await pageA.goto(href!);
  await expect(pageA.getByText("Histórico de visitas")).toBeVisible();

  const b = await browser.newContext();
  const pageB = await b.newPage();
  await login(pageB, "aurora@studio.test");
  await pageB.goto("/clientes");
  await expect(pageB.getByText("8 clientes")).toBeVisible();
  await pageB.goto(href!);
  await expect(pageB.getByText("Não encontramos o que você procurava")).toBeVisible();
  const exp = await pageB.request.get(`/api${href}/exportar`);
  expect(exp.status()).toBe(404);
  await a.close();
  await b.close();
});

test("perfil de equipe não exporta todos os dados", async ({ page }) => {
  await login(page, "equipe@belavida.test");
  const res = await page.request.get("/api/exportar");
  expect(res.status()).toBe(403);
  await page.goto("/configuracoes");
  await expect(page.getByText(/Você tem acesso de equipe/)).toBeVisible();
});

test("responsável exporta somente os dados da própria empresa", async ({ page }) => {
  await login(page, "demo@belavida.test");
  const res = await page.request.get("/api/exportar");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.clientes.length).toBeGreaterThan(0);
  expect(body.clientes.every((c: { tenant_id: string }) => c.tenant_id === body.empresa.id)).toBe(true);
});
