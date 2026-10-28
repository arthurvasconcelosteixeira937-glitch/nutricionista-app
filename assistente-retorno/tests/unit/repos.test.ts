import { beforeAll, describe, expect, it } from "vitest";

// Banco em memória com as contas demonstrativas (dois salões).
process.env.DATABASE_PATH = ":memory:";
process.env.SEED_DEMO = "true";
process.env.AI_PROVIDER = "demo";

const { all, get, run } = await import("@/lib/db");
const clients = await import("@/lib/repos/clients");
const campaigns = await import("@/lib/repos/campaigns");
const reactivation = await import("@/lib/repos/reactivation");
const privacy = await import("@/lib/repos/privacy");
const imports = await import("@/lib/repos/imports");
const { findUserForLogin } = await import("@/lib/repos/accounts");
const { getReport } = await import("@/lib/repos/reports");
const { DomainError, NotFoundError } = await import("@/lib/domain/errors");
type Ctx = import("@/lib/auth/context").TenantContext;

let salonA: Ctx;
let salonB: Ctx;
let staffA: Ctx;

function ctxFor(email: string): Ctx {
  const found = findUserForLogin(email, "demo12345");
  if (!found) throw new Error(`login falhou para ${email}`);
  const role = get<{ role: "owner" | "staff" }>(
    "SELECT role FROM memberships WHERE user_id = ? AND tenant_id = ?",
    found.userId,
    found.tenantId,
  )!.role;
  return { ...found, role };
}

const baseCampaign = {
  name: "Teste",
  objective: null,
  goal: "reagendar" as const,
  tone: "acolhedor" as const,
  serviceFocus: null,
  salonDisplayName: "Salão Teste",
  includeName: true,
  includeOptOut: true,
  extraFacts: null,
  attributionWindowDays: 30,
};

function eligibleClientIds(ctx: Ctx, n: number): string[] {
  return reactivation
    .listReactivationCandidates(ctx)
    .filter((c) => reactivation.eligibleForNewCampaign(c).eligible)
    .slice(0, n)
    .map((c) => c.client.id);
}

beforeAll(() => {
  salonA = ctxFor("demo@belavida.test");
  staffA = ctxFor("equipe@belavida.test");
  salonB = ctxFor("aurora@studio.test");
});

describe("autenticação", () => {
  it("rejeita senha errada", () => {
    expect(findUserForLogin("demo@belavida.test", "errada")).toBeNull();
  });
});

describe("isolamento entre empresas", () => {
  it("cada salão vê apenas os próprios clientes", () => {
    const a = clients.listAllClientsWithLastVisit(salonA);
    const b = clients.listAllClientsWithLastVisit(salonB);
    expect(a).toHaveLength(42);
    expect(b).toHaveLength(8);
    const idsA = new Set(a.map((c) => c.id));
    expect(b.some((c) => idsA.has(c.id))).toBe(false);
  });

  it("não lê, altera, exclui nem exporta cliente de outro salão", () => {
    const foreign = clients.listAllClientsWithLastVisit(salonA)[0];
    expect(clients.getClient(salonB, foreign.id)).toBeUndefined();
    expect(() => clients.deleteClient(salonB, foreign.id)).toThrow(NotFoundError);
    expect(() => clients.setOptOut(salonB, foreign.id, null)).toThrow(NotFoundError);
    expect(() => clients.exportClientData(salonB, foreign.id)).toThrow(NotFoundError);
    expect(() =>
      clients.addVisit(salonB, foreign.id, { serviceId: null, visitDate: "2026-01-01", amountCents: null, origin: "manual", campaignId: null }),
    ).toThrow(NotFoundError);
    expect(clients.getClient(salonA, foreign.id)).toBeDefined();
  });

  it("não inclui cliente de outro salão numa campanha", () => {
    const foreign = eligibleClientIds(salonA, 1);
    expect(() => campaigns.createCampaign(salonB, baseCampaign, foreign)).toThrow(/não encontrada/);
  });

  it("não acessa campanha nem contato de outro salão", () => {
    const demoCampaign = campaigns.listCampaigns(salonA)[0];
    expect(campaigns.getCampaign(salonB, demoCampaign.id)).toBeUndefined();
    const contact = campaigns.listContacts(salonA, demoCampaign.id)[0];
    expect(() => campaigns.requireContact(salonB, contact.id)).toThrow(NotFoundError);
    expect(() => campaigns.registerOutcome(salonB, contact.id, { type: "replied", date: "2026-10-01" })).toThrow(NotFoundError);
  });

  it("exportação contém apenas dados da própria empresa", () => {
    const data = privacy.exportTenantData(salonB);
    expect(data.clientes).toHaveLength(8);
    expect((data.clientes as { tenant_id: string }[]).every((c) => c.tenant_id === salonB.tenantId)).toBe(true);
  });

  it("perfil de equipe não exporta nem exclui a conta", () => {
    expect(() => privacy.exportTenantData(staffA)).toThrow(DomainError);
    expect(() => privacy.deleteTenant(staffA)).toThrow(DomainError);
  });
});

describe("lista de reativação", () => {
  it("campanha concluída não bloqueia nova campanha (regressão)", () => {
    const fromCompleted = reactivation
      .listReactivationCandidates(salonA)
      .filter((c) => c.latestCampaign && c.evaluation.contactability === "ok");
    expect(fromCompleted.length).toBeGreaterThan(0);
    for (const c of fromCompleted) {
      expect(c.contactStatus).toBe("closed");
      expect(reactivation.eligibleForNewCampaign(c).eligible).toBe(true);
    }
  });
});

describe("fluxo de campanha", () => {
  it("exige consentimento para entrar na campanha", () => {
    const noConsent = clients
      .listAllClientsWithLastVisit(salonA)
      .find((c) => c.consent_status !== "granted" && !c.opted_out_at)!;
    expect(() => campaigns.createCampaign(salonA, baseCampaign, [noConsent.id])).toThrow(/autorização/);
  });

  it("gera, aprova, registra envio e resultado com atribuição", async () => {
    const ids = eligibleClientIds(salonA, 2);
    const id = campaigns.createCampaign(salonA, baseCampaign, ids);
    // não permite colocar a mesma cliente em duas campanhas abertas
    expect(() => campaigns.createCampaign(salonA, baseCampaign, [ids[0]])).toThrow(/já está na campanha/);

    const report = await campaigns.generateMessages(salonA, id);
    expect(report).toMatchObject({ generated: 2, failed: 0, mode: "demo" });
    const [c1, c2] = campaigns.listContacts(salonA, id);
    expect(c1.message_origin).toBe("demo_template");
    expect(c1.stage).toBe("drafted");

    // não envia sem aprovação
    expect(() => campaigns.markSent(salonA, c1.id, "manual_whatsapp")).toThrow(/Aprove/);
    // não registra resultado sem envio
    expect(() => campaigns.registerOutcome(salonA, c1.id, { type: "replied", date: "2026-10-01" })).toThrow(/envio/);

    campaigns.approveMessage(salonA, c1.id);
    // editar depois de aprovar exige nova aprovação
    campaigns.editMessage(salonA, c1.id, "Olá! Texto revisado manualmente pela equipe do salão.");
    expect(campaigns.requireContact(salonA, c1.id).approved_at).toBeNull();
    campaigns.approveMessage(salonA, c1.id);
    campaigns.markSent(salonA, c1.id, "manual_whatsapp");
    expect(campaigns.requireCampaign(salonA, id).status).toBe("active");

    const sentAt = campaigns.requireContact(salonA, c1.id).sent_at!;
    const { timestampToLocalDate, todayISO, addDays } = await import("@/lib/domain/dates");
    const sentDate = timestampToLocalDate(sentAt);
    expect(() => campaigns.registerOutcome(salonA, c1.id, { type: "replied", date: addDays(sentDate, -1) })).toThrow(/anterior ao envio/);
    expect(() => campaigns.registerOutcome(salonA, c1.id, { type: "replied", date: addDays(todayISO(), 1) })).toThrow(/futuro/);
    expect(() => campaigns.registerOutcome(salonA, c1.id, { type: "replied", date: todayISO(), amountCents: 100 })).toThrow(/Valor/);

    campaigns.registerOutcome(salonA, c1.id, { type: "returned", date: todayISO(), amountCents: 12000, createVisit: true });
    const after = campaigns.requireContact(salonA, c1.id);
    expect(after).toMatchObject({ stage: "returned", revenue_cents: 12000, revenue_source: "manual" });
    // a visita entrou no histórico e a cliente sai da lista de reativação
    expect(clients.listVisits(salonA, c1.client_id)[0]).toMatchObject({ origin: "campaign", campaign_id: id });
    expect(reactivation.listReactivationCandidates(salonA).some((c) => c.client.id === c1.client_id)).toBe(false);

    const r = getReport(salonA).campaigns.find((c) => c.campaign.id === id)!;
    expect(r.funnel).toMatchObject({ selected: 2, sent: 1, returnedAttributed: 1, revenueManualCents: 12000 });
    expect(r.rates[2]).toMatchObject({ numerator: 1, denominator: 1 });

    // pedido de oposição bloqueia aprovação do outro contato
    clients.setOptOut(salonA, c2.client_id, "teste");
    expect(campaigns.requireContact(salonA, c2.id).stage).toBe("opted_out");
    expect(() => campaigns.approveMessage(salonA, c2.id)).toThrow(/autorização/);

    // campanha com envio não pode ser excluída
    expect(() => campaigns.deleteCampaign(salonA, id)).toThrow(/Conclua/);
    campaigns.setCampaignStatus(salonA, id, "completed");
    expect(() => campaigns.setCampaignStatus(salonA, id, "active")).toThrow(/não permitida/);
  });

  it("respeita o limite de campanhas em andamento do plano", () => {
    // plano piloto: 2 campanhas em andamento
    const make = () => {
      const id = campaigns.createCampaign(salonB, baseCampaign, []);
      return id;
    };
    expect(make).toThrow(/ao menos uma/);
    run("UPDATE clients SET consent_status = 'granted', opted_out_at = NULL WHERE tenant_id = ?", salonB.tenantId);
    const ids = all<{ id: string }>("SELECT id FROM clients WHERE tenant_id = ? LIMIT 3", salonB.tenantId).map((r) => r.id);
    const c = ids.map((cid) => campaigns.createCampaign(salonB, baseCampaign, [cid]));
    campaigns.setCampaignStatus(salonB, c[0], "active");
    campaigns.setCampaignStatus(salonB, c[1], "active");
    expect(() => campaigns.setCampaignStatus(salonB, c[2], "active")).toThrow(/permite 2 campanhas/);
  });
});

describe("importação", () => {
  it("revalida no servidor e só grava autorização com confirmação", () => {
    const rows = [
      { name: "Importada Um", phone: "(11) 97777-0001", consent: "sim", lastVisit: "01/05/2026", service: "Serviço Novo" },
      { name: "Importada Dois", phone: "(11) 97777-0002", consent: "sim" },
      { name: "", phone: "abc" },
    ];
    const result = imports.commitImport(salonB, rows, { consentConfirmed: false });
    expect(result).toEqual({ imported: 2, skippedInvalid: 1, skippedDuplicates: 0 });
    const saved = all<{ consent_status: string }>(
      "SELECT consent_status FROM clients WHERE tenant_id = ? AND phone LIKE '+55119777700%'",
      salonB.tenantId,
    );
    expect(saved.every((c) => c.consent_status === "not_informed")).toBe(true);
    // serviço desconhecido é criado no salão certo
    expect(get("SELECT 1 AS x FROM services WHERE tenant_id = ? AND name = 'Serviço Novo'", salonB.tenantId)).toBeDefined();
    expect(get("SELECT 1 AS x FROM services WHERE tenant_id = ? AND name = 'Serviço Novo'", salonA.tenantId)).toBeUndefined();
    // segunda importação do mesmo arquivo: tudo duplicado
    expect(imports.commitImport(salonB, rows, { consentConfirmed: true })).toEqual({ imported: 0, skippedInvalid: 1, skippedDuplicates: 2 });
  });
});
