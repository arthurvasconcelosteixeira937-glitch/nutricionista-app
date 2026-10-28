import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { hashPassword } from "@/lib/auth/password";
import { addDays, todayISO } from "@/lib/domain/dates";
import { generateDemoMessage } from "@/lib/ai/demo";

/**
 * DADOS FICTÍCIOS DE DEMONSTRAÇÃO. Nomes, telefones, visitas e resultados foram inventados
 * para demonstrar o produto e estão marcados com is_demo = 1. Não representam resultados reais.
 */

export const DEFAULT_SERVICES: [string, number | null][] = [
  ["Corte feminino", 45],
  ["Corte masculino", 30],
  ["Coloração", 45],
  ["Mechas / luzes", 90],
  ["Escova", 15],
  ["Hidratação", 30],
  ["Progressiva", 120],
  ["Manicure", 15],
  ["Pedicure", 21],
  ["Design de sobrancelha", 21],
];

export const DEMO_PASSWORD = "demo12345";
export const DEMO_ACCOUNTS = [
  { email: "demo@belavida.test", name: "Carla (proprietária)", role: "owner" as const },
  { email: "equipe@belavida.test", name: "Júlia (recepção)", role: "staff" as const },
];
export const SECOND_DEMO_ACCOUNT = { email: "aurora@studio.test", name: "Renata (proprietária)" };

const FIRST_NAMES = [
  "Ana", "Beatriz", "Camila", "Daniela", "Eduarda", "Fernanda", "Gabriela", "Helena", "Isabela", "Juliana",
  "Larissa", "Mariana", "Natália", "Patrícia", "Rafaela", "Sabrina", "Tatiane", "Vanessa", "Yasmin", "Aline",
  "Bruna", "Carolina", "Débora", "Elaine", "Flávia", "Giovana", "Ingrid", "Jéssica", "Letícia", "Mônica",
  "Paula", "Renata", "Simone", "Thaís", "Viviane", "Lucas", "Rodrigo", "Marcos", "Felipe", "André",
];
const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa", "Rodrigues", "Almeida", "Nascimento",
  "Carvalho", "Araújo", "Ribeiro", "Gomes", "Martins", "Rocha", "Barbosa", "Melo", "Cardoso", "Teixeira",
];

function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface ServiceRef {
  id: string;
  name: string;
  interval: number | null;
}

function insertServices(db: DatabaseSync, tenantId: string, now: string): ServiceRef[] {
  const out: ServiceRef[] = [];
  const existing = db
    .prepare("SELECT id, name, return_interval_days AS interval FROM services WHERE tenant_id = ?")
    .all(tenantId) as unknown as ServiceRef[];
  if (existing.length > 0) return existing;
  for (const [name, interval] of DEFAULT_SERVICES) {
    const id = randomUUID();
    db.prepare(
      "INSERT INTO services (id, tenant_id, name, return_interval_days, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(id, tenantId, name, interval, now);
    out.push({ id, name, interval });
  }
  return out;
}

const PRICES: Record<string, number> = {
  "Corte feminino": 9000, "Corte masculino": 5000, "Coloração": 18000, "Mechas / luzes": 35000,
  "Escova": 6000, "Hidratação": 8000, "Progressiva": 30000, "Manicure": 4000, "Pedicure": 4500,
  "Design de sobrancelha": 4000,
};

/** Insere clientes, visitas e uma campanha concluída fictícios no tenant indicado. */
export function seedDemoData(db: DatabaseSync, tenantId: string, opts: { clients?: number; seed?: number; phoneBase?: number; withCampaign?: boolean } = {}): void {
  const rand = prng(opts.seed ?? 42);
  const today = todayISO();
  const now = new Date().toISOString();
  const services = insertServices(db, tenantId, now);
  const byName = (n: string) => services.find((s) => s.name === n) ?? services[0];
  const salonName = (db.prepare("SELECT name FROM tenants WHERE id = ?").get(tenantId) as { name: string }).name;
  const total = opts.clients ?? 42;
  const phoneBase = opts.phoneBase ?? 0;

  const insertClient = db.prepare(
    `INSERT INTO clients (id, tenant_id, name, phone, notes, contact_source, legal_basis, consent_status, consent_recorded_at,
                          opted_out_at, opt_out_note, next_visit_date, is_demo, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  );
  const insertVisit = db.prepare(
    `INSERT INTO visits (id, tenant_id, client_id, service_id, service_name, visit_date, amount_cents, origin, campaign_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const mainServices = ["Coloração", "Corte feminino", "Manicure", "Escova", "Mechas / luzes", "Hidratação", "Progressiva", "Design de sobrancelha", "Corte masculino", "Pedicure"];
  const sources = ["Atendimento no salão", "Instagram", "Indicação", "WhatsApp", "Agenda/sistema anterior"];
  const created: { id: string; name: string; consent: string; lastVisit: string; service: ServiceRef }[] = [];

  for (let i = 0; i < total; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
    const name = `${first} ${last}`;
    const phone = `+551190000${String(phoneBase + i + 1).padStart(4, "0")}`;
    const service = byName(mainServices[Math.floor(rand() * mainServices.length)]);
    const interval = service.interval ?? 60;
    // Distribui a última visita entre "em dia" e "atrasada" em relação ao prazo do serviço.
    const factor = rand() < 0.35 ? rand() * 0.9 : 1.1 + rand() * 2.5;
    const daysAgo = Math.max(3, Math.round(interval * factor));
    const lastVisit = addDays(today, -daysAgo);
    const r = rand();
    const consent = r < 0.7 ? "granted" : r < 0.9 ? "not_informed" : "denied";
    const optedOut = i === 7 ? addDays(today, -20) : null;
    const nextVisit = i % 13 === 5 ? addDays(today, 3 + (i % 10)) : null;
    const id = randomUUID();
    insertClient.run(
      id, tenantId, name, phone,
      i % 6 === 0 ? "Prefere atendimento à tarde." : null,
      sources[i % sources.length],
      consent === "granted" ? "consentimento" : null,
      consent,
      consent === "not_informed" ? null : addDays(today, -daysAgo - 30) + "T12:00:00.000Z",
      optedOut ? optedOut + "T12:00:00.000Z" : null,
      optedOut ? "Pediu por WhatsApp para não receber mensagens." : null,
      nextVisit,
      now, now,
    );
    // Histórico: visitas anteriores no mesmo intervalo aproximado.
    const visitsCount = 1 + Math.floor(rand() * 3);
    for (let v = visitsCount - 1; v >= 0; v--) {
      const date = addDays(lastVisit, -v * interval);
      insertVisit.run(randomUUID(), tenantId, id, service.id, service.name, date, PRICES[service.name] ?? null, "manual", null, now);
    }
    created.push({ id, name, consent, lastVisit, service });
  }

  if (opts.withCampaign === false) return;

  // Campanha concluída fictícia para os relatórios terem o que mostrar.
  const campaignId = randomUUID();
  const createdAt = addDays(today, -52) + "T13:00:00.000Z";
  db.prepare(
    `INSERT INTO campaigns (id, tenant_id, name, objective, goal, tone, service_focus, salon_display_name, include_name,
                            include_opt_out, extra_facts, attribution_window_days, status, is_demo, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'reagendar', 'acolhedor', NULL, ?, 1, 1, NULL, 30, 'completed', 1, NULL, ?, ?)`,
  ).run(
    campaignId, tenantId,
    "Exemplo fictício — retorno de clientes de coloração",
    "Campanha demonstrativa com resultados inventados, para ilustrar os relatórios.",
    salonName, createdAt, createdAt,
  );

  // Só clientes que já estavam atrasadas na data do envio fictício, para o histórico ficar coerente.
  const eligible = created
    .filter((c) => c.consent === "granted" && c.lastVisit <= addDays(today, -50 - (c.service.interval ?? 60)))
    .slice(0, 8);
  const sentAt = addDays(today, -50) + "T14:00:00.000Z";
  const outcomes = ["returned", "returned", "scheduled", "replied", "no_reply", "no_reply", "not_interested", "sent"];
  const insertContact = db.prepare(
    `INSERT INTO campaign_contacts (id, tenant_id, campaign_id, client_id, stage, message_text, message_origin, message_warnings,
            message_generated_at, approved_at, sent_at, sent_channel, sent_data_source, replied_at, scheduled_at, scheduled_for,
            returned_at, revenue_cents, revenue_source, closed_reason, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'demo_template', '[]', ?, ?, ?, 'manual_whatsapp', 'manual', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  eligible.forEach((c, idx) => {
    const outcome = outcomes[idx];
    const text = generateDemoMessage({
      seed: c.id, clientFirstName: c.name.split(" ")[0], salonName, serviceName: c.service.name,
      daysSinceLastVisit: null, tone: "acolhedor", goal: "reagendar", includeOptOut: true, extraFacts: null,
    }).text;
    const replied = ["returned", "scheduled", "replied", "not_interested"].includes(outcome) ? addDays(today, -49) : null;
    const scheduled = ["returned", "scheduled"].includes(outcome) ? addDays(today, -48) : null;
    const returned = outcome === "returned" ? addDays(today, -42 + idx) : null;
    const revenue = outcome === "returned" ? (idx === 0 ? 18000 : 9500) : null;
    insertContact.run(
      randomUUID(), tenantId, campaignId, c.id, outcome, text,
      addDays(today, -51) + "T12:00:00.000Z", addDays(today, -51) + "T12:30:00.000Z", sentAt,
      replied, scheduled, scheduled ? addDays(today, -42 + idx) : null, returned, revenue,
      revenue != null ? "manual" : null,
      outcome === "no_reply" || outcome === "not_interested" ? outcome : null,
      createdAt, createdAt,
    );
    if (returned) {
      insertVisit.run(randomUUID(), tenantId, c.id, c.service.id, c.service.name, returned, revenue, "campaign", campaignId, now);
    }
  });
}

/** Remove apenas os dados marcados como demonstrativos. */
export function removeDemoData(db: DatabaseSync, tenantId: string): void {
  db.prepare("DELETE FROM campaigns WHERE tenant_id = ? AND is_demo = 1").run(tenantId);
  db.prepare("DELETE FROM clients WHERE tenant_id = ? AND is_demo = 1").run(tenantId);
}

function createTenantWithUsers(
  db: DatabaseSync,
  name: string,
  users: { email: string; name: string; role: "owner" | "staff" }[],
): string {
  const now = new Date().toISOString();
  const tenantId = randomUUID();
  db.prepare(
    "INSERT INTO tenants (id, name, plan, default_interval_days, data_retention_months, is_demo, created_at) VALUES (?, ?, 'piloto', 60, 24, 1, ?)",
  ).run(tenantId, name, now);
  const hash = hashPassword(DEMO_PASSWORD);
  for (const u of users) {
    const userId = randomUUID();
    db.prepare("INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)").run(
      userId, u.email, u.name, hash, now,
    );
    db.prepare("INSERT INTO memberships (tenant_id, user_id, role, created_at) VALUES (?, ?, ?, ?)").run(
      tenantId, userId, u.role, now,
    );
  }
  return tenantId;
}

/** Cria as contas demonstrativas quando o banco está vazio. */
export function seedDemoIfEmpty(db: DatabaseSync): void {
  const row = db.prepare("SELECT COUNT(*) AS n FROM tenants").get() as { n: number };
  if (row.n > 0) return;
  db.exec("BEGIN");
  try {
    const main = createTenantWithUsers(db, "Salão Bela Vida", DEMO_ACCOUNTS);
    seedDemoData(db, main, { clients: 42, seed: 42 });
    const second = createTenantWithUsers(db, "Studio Aurora", [{ ...SECOND_DEMO_ACCOUNT, role: "owner" }]);
    seedDemoData(db, second, { clients: 8, seed: 7, phoneBase: 500, withCampaign: false });
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
