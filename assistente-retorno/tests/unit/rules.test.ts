import { describe, expect, it } from "vitest";
import { evaluateReactivation, type ReactivationInput } from "@/lib/domain/reactivation";
import { attributionStatus } from "@/lib/domain/attribution";
import { computeFunnel, formatPercent, funnelRates, type MetricsContactRow } from "@/lib/domain/reports";
import { checkMessage } from "@/lib/ai/guardrails";
import { generateDemoMessage } from "@/lib/ai/demo";
import type { CampaignGoal, MessageTone } from "@/lib/domain/labels";

const base: ReactivationInput = {
  consentStatus: "granted",
  optedOutAt: null,
  nextVisitDate: null,
  lastVisitDate: "2026-08-01",
  lastServiceName: "Coloração",
  serviceIntervalDays: 45,
};
const opts = { today: "2026-10-28", defaultIntervalDays: 60 };

describe("reativação", () => {
  it("usa o prazo do serviço e explica o motivo", () => {
    const r = evaluateReactivation(base, opts);
    expect(r.due).toBe(true);
    expect(r.daysSince).toBe(88);
    expect(r.daysOverdue).toBe(43);
    expect(r.thresholdSource).toBe("service");
    expect(r.reasons[0]).toBe("Última visita em 01/08/2026 (Coloração), há 88 dias.");
    expect(r.reasons[1]).toMatch(/prazo de retorno configurado para Coloração é de 45 dias/);
  });

  it("serviços diferentes têm prazos diferentes", () => {
    const progressiva = evaluateReactivation({ ...base, lastServiceName: "Progressiva", serviceIntervalDays: 120 }, opts);
    expect(progressiva.due).toBe(false);
    expect(progressiva.excludedReason).toMatch(/dentro do prazo/);
  });

  it("usa o prazo padrão quando o serviço não tem prazo", () => {
    const r = evaluateReactivation({ ...base, serviceIntervalDays: null }, opts);
    expect(r.thresholdDays).toBe(60);
    expect(r.thresholdSource).toBe("default");
  });

  it("filtro de dias substitui o prazo", () => {
    const r = evaluateReactivation(base, { ...opts, minDaysOverride: 90 });
    expect(r.due).toBe(false);
    expect(r.thresholdSource).toBe("filter");
  });

  it("exclui quem já tem próxima visita ou não tem visita", () => {
    expect(evaluateReactivation({ ...base, nextVisitDate: "2026-11-02" }, opts).due).toBe(false);
    expect(evaluateReactivation({ ...base, lastVisitDate: null }, opts).due).toBe(false);
  });

  it("informa se pode receber mensagens", () => {
    expect(evaluateReactivation({ ...base, consentStatus: "not_informed" }, opts).contactability).toBe("no_consent");
    expect(evaluateReactivation({ ...base, consentStatus: "denied" }, opts).contactability).toBe("consent_denied");
    expect(evaluateReactivation({ ...base, optedOutAt: "2026-10-01T00:00:00Z" }, opts).contactability).toBe("opted_out");
  });
});

describe("atribuição", () => {
  const sentAt = "2026-10-01T15:00:00.000Z";
  it("conta apenas retornos dentro da janela após o envio", () => {
    expect(attributionStatus({ sentAt, returnedAt: "2026-10-20", windowDays: 30 })).toBe("attributed");
    expect(attributionStatus({ sentAt, returnedAt: "2026-10-31", windowDays: 30 })).toBe("attributed");
    expect(attributionStatus({ sentAt, returnedAt: "2026-11-01", windowDays: 30 })).toBe("outside_window");
    expect(attributionStatus({ sentAt, returnedAt: "2026-09-30", windowDays: 30 })).toBe("outside_window");
    expect(attributionStatus({ sentAt: null, returnedAt: "2026-10-20", windowDays: 30 })).toBe("not_returned");
  });
});

describe("relatórios", () => {
  const row = (p: Partial<MetricsContactRow>): MetricsContactRow => ({
    message_text: "x",
    approved_at: null,
    sent_at: null,
    replied_at: null,
    scheduled_at: null,
    returned_at: null,
    revenue_cents: null,
    revenue_source: null,
    attribution_window_days: 30,
    ...p,
  });

  it("sem envios exibe 'Sem dados suficientes'", () => {
    const rates = funnelRates(computeFunnel([row({}), row({ message_text: null })]));
    expect(rates.every((r) => r.value === null)).toBe(true);
    expect(formatPercent(rates[0].value)).toBe("Sem dados suficientes");
  });

  it("calcula taxas sobre mensagens enviadas e separa receita manual de integração", () => {
    const sent = "2026-10-01T12:00:00.000Z";
    const f = computeFunnel([
      row({ approved_at: sent, sent_at: sent, replied_at: "2026-10-02", scheduled_at: "2026-10-02", returned_at: "2026-10-10", revenue_cents: 15000, revenue_source: "manual" }),
      row({ approved_at: sent, sent_at: sent, returned_at: "2026-12-30", revenue_cents: 9999, revenue_source: "manual" }), // fora da janela
      row({ approved_at: sent, sent_at: sent, replied_at: "2026-10-03" }),
      row({ approved_at: sent, sent_at: sent, returned_at: "2026-10-05", revenue_cents: 5000, revenue_source: "integration" }),
      row({ approved_at: sent }),
    ]);
    expect(f).toMatchObject({
      selected: 5, prepared: 5, approved: 5, sent: 4, replied: 2, scheduled: 1,
      returnedAttributed: 2, returnedOutsideWindow: 1, returnsWithRevenue: 2,
      revenueManualCents: 15000, revenueIntegrationCents: 5000,
    });
    const [reply, , ret] = funnelRates(f);
    expect(reply).toMatchObject({ numerator: 2, denominator: 4, value: 0.5, smallSample: true });
    expect(ret.value).toBe(0.5);
    expect(formatPercent(reply.value)).toBe("50,0%");
  });
});

describe("mensagens", () => {
  it("sinaliza promessas não registradas", () => {
    const w = checkMessage("Oi! Temos 20% de desconto e vagas hoje.", null);
    expect(w.join(" ")).toMatch(/desconto/);
    expect(w.join(" ")).toMatch(/percentual/);
    expect(w.join(" ")).toMatch(/disponibilidade/);
    expect(w.join(" ")).toMatch(/data específica/);
  });

  it("não sinaliza o que o salão informou na campanha", () => {
    expect(checkMessage("Temos horários livres aos sábados.", "Temos horários livres aos sábados")).toEqual([]);
  });

  it("modo demonstrativo nunca inventa descontos, preços ou disponibilidade", () => {
    const goals: CampaignGoal[] = ["reagendar", "saber_como_esta", "lembrete_manutencao"];
    const tones: MessageTone[] = ["acolhedor", "profissional", "descontraido"];
    for (const goal of goals)
      for (const tone of tones)
        for (const seed of ["a", "b", "c", "d", "e"])
          for (const serviceName of ["Coloração", null]) {
            const m = generateDemoMessage({
              seed, clientFirstName: "Ana", salonName: "Salão Exemplo", serviceName,
              daysSinceLastVisit: 90, tone, goal, includeOptOut: true, extraFacts: null,
            });
            expect(m.origin).toBe("demo_template");
            expect(checkMessage(m.text, null)).toEqual([]);
            expect(m.text).toContain("Ana");
            expect(m.text).toContain("não receber mensagens");
          }
  });

  it("não usa o nome quando a campanha pede para omitir", () => {
    const m = generateDemoMessage({
      seed: "x", clientFirstName: null, salonName: "Salão", serviceName: null,
      daysSinceLastVisit: null, tone: "acolhedor", goal: "reagendar", includeOptOut: false, extraFacts: null,
    });
    expect(m.text.startsWith("Olá! Tudo bem?")).toBe(true);
    expect(m.text).not.toMatch(/não receber/);
  });
});
