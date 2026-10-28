import type { GeneratedMessage, MessageRequest } from "./types";

/**
 * MODO DEMONSTRATIVO: monta mensagens a partir de modelos de texto fixos.
 * Nenhuma IA é chamada. Usa apenas os dados registrados (nome, serviço, nome do salão).
 */

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(items: T[], seed: string): T {
  return items[hash(seed) % items.length];
}

function lower(s: string): string {
  return s.toLocaleLowerCase("pt-BR");
}

export function generateDemoMessage(req: MessageRequest): GeneratedMessage {
  const n = req.clientFirstName;
  const salon = req.salonName;
  const svc = req.serviceName ? lower(req.serviceName) : null;

  const greeting = {
    acolhedor: n ? `Olá, ${n}! Tudo bem?` : "Olá! Tudo bem?",
    profissional: n ? `Olá, ${n}, tudo bem?` : "Olá, tudo bem?",
    descontraido: n ? `Oi, ${n}! Como você está?` : "Oi! Como você está?",
  }[req.tone];

  const intro = `Aqui é da equipe ${salon}.`;

  // Frases sem artigo antes do serviço ("de coloração"), para não errar a concordância de gênero.
  const bodies: Record<MessageRequest["goal"], string[]> = {
    reagendar: [
      `Faz um tempinho desde a sua última visita${svc ? ` para ${svc}` : ""}. Se quiser agendar novamente, estamos à disposição para te ajudar.`,
      `Sentimos sua falta por aqui${svc ? ` desde o seu último atendimento de ${svc}` : ""}. Quando quiser marcar um novo horário, é só nos chamar.`,
      `Passando para lembrar que, se quiser voltar${svc ? ` para um novo atendimento de ${svc}` : ""}, será um prazer te atender de novo. É só responder esta mensagem para combinarmos.`,
    ],
    saber_como_esta: [
      `Passando para saber como você está${svc ? ` e como ficou o resultado do seu atendimento de ${svc}` : ""}. Se precisar de algo, é só chamar.`,
      `Queríamos saber como você está${svc ? ` e se ficou satisfeita com o atendimento de ${svc}` : ""}. Sua opinião é importante para nós.`,
    ],
    lembrete_manutencao: [
      svc
        ? `Pelo tempo desde o seu último atendimento de ${svc}, talvez já seja um bom momento para a manutenção. Se quiser, podemos combinar um horário que funcione para você.`
        : `Pelo tempo desde o seu último atendimento, talvez já seja um bom momento para uma manutenção. Se quiser, podemos combinar um horário que funcione para você.`,
      `Lembrete amigável: ${svc ? `atendimentos de ${svc}` : "alguns serviços"} costumam pedir manutenção periódica. Quando quiser agendar, estamos por aqui.`,
    ],
  };

  const parts = [greeting, intro, pick(bodies[req.goal], req.seed)];
  if (req.includeOptOut) parts.push("Se preferir não receber mensagens nossas, é só responder avisando.");
  return { text: parts.join(" "), origin: "demo_template", model: null };
}
