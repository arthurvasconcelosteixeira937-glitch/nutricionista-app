import { describe, expect, it } from "vitest";
import { formatPhoneBR, normalizeBrazilPhone } from "@/lib/domain/phone";
import { addDays, daysBetween, formatDateBR, parseFlexibleDate, todayISO } from "@/lib/domain/dates";
import { formatBRL, parseBRLToCents } from "@/lib/domain/money";
import { detectDelimiter, parseCsv, toCsv } from "@/lib/domain/csv";
import { applyMapping, guessMapping, parseConsent, validateImportRows } from "@/lib/domain/import";

describe("telefone", () => {
  it.each([
    ["(11) 98765-4321", "+5511987654321"],
    ["11987654321", "+5511987654321"],
    ["+55 11 98765-4321", "+5511987654321"],
    ["011 98765 4321", "+5511987654321"],
    ["(21) 3333-4444", "+552133334444"],
  ])("normaliza %s", (raw, expected) => {
    expect(normalizeBrazilPhone(raw)).toBe(expected);
  });

  it.each(["123", "(01) 98765-4321", "(11) 88765-4321", "(11) 1234-5678", ""])("rejeita %s", (raw) => {
    expect(normalizeBrazilPhone(raw)).toBeNull();
  });

  it("formata para exibição", () => {
    expect(formatPhoneBR("+5511987654321")).toBe("(11) 98765-4321");
    expect(formatPhoneBR("+552133334444")).toBe("(21) 3333-4444");
  });
});

describe("datas", () => {
  it("interpreta formatos brasileiros e ISO", () => {
    expect(parseFlexibleDate("31/12/2025")).toBe("2025-12-31");
    expect(parseFlexibleDate("1/2/25")).toBe("2025-02-01");
    expect(parseFlexibleDate("2025-03-09")).toBe("2025-03-09");
    expect(parseFlexibleDate("31/02/2026")).toBeNull();
    expect(parseFlexibleDate("ontem")).toBeNull();
  });

  it("calcula diferença de dias e soma", () => {
    expect(daysBetween("2026-01-01", "2026-03-01")).toBe(59);
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
    expect(formatDateBR("2026-10-28")).toBe("28/10/2026");
  });

  it("usa o fuso de São Paulo para 'hoje'", () => {
    // 02:00 UTC de 28/10 ainda é 27/10 em São Paulo (UTC-3)
    expect(todayISO(new Date("2026-10-28T02:00:00Z"))).toBe("2026-10-27");
  });
});

describe("dinheiro", () => {
  it.each([
    ["R$ 1.234,56", 123456],
    ["180", 18000],
    ["180,5", 18050],
    ["180.50", 18050],
    ["0,99", 99],
  ])("converte %s", (raw, cents) => expect(parseBRLToCents(raw)).toBe(cents));
  it("rejeita valores inválidos", () => {
    expect(parseBRLToCents("abc")).toBeNull();
    expect(parseBRLToCents("-10")).toBeNull();
  });
  it("formata em reais", () => expect(formatBRL(18050).replace(/\s/g, " ")).toBe("R$ 180,50"));
});

describe("CSV", () => {
  it("detecta separador e respeita aspas", () => {
    const text = 'nome;obs\r\n"Silva; Ana";"disse ""oi"""\r\nBia;\r\n';
    expect(detectDelimiter(text)).toBe(";");
    expect(parseCsv(text)).toEqual([
      ["nome", "obs"],
      ["Silva; Ana", 'disse "oi"'],
      ["Bia", ""],
    ]);
  });
  it("ignora linhas vazias e BOM", () => {
    expect(parseCsv("﻿a,b\n\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
  it("gera CSV com escape", () => {
    expect(toCsv([["a;b", 'x"y', null]])).toBe('"a;b";"x""y";');
  });
});

describe("importação", () => {
  const headers = "nome;telefone;servico;ultima_visita;proxima_visita;valor;autorizou_mensagens;origem;observacoes".split(";");

  it("sugere o mapeamento das colunas, incluindo autorização", () => {
    expect(guessMapping(headers)).toEqual({
      name: 0, phone: 1, service: 2, lastVisit: 3, nextVisit: 4, amount: 5, consent: 6, source: 7, notes: 8,
    });
  });

  it("interpreta autorização", () => {
    expect(parseConsent("Sim")).toBe("granted");
    expect(parseConsent("não")).toBe("denied");
    expect(parseConsent("")).toBe("not_informed");
    expect(parseConsent("talvez")).toBe("invalid");
  });

  it("valida linhas, marca duplicidades e erros", () => {
    const rows = applyMapping(
      [
        ["Ana", "(11) 90000-1101", "Coloração", "15/06/2026", "", "180,00", "sim", "", ""],
        ["Bia", "11900001102", "", "", "", "", "", "", ""],
        ["Ana de novo", "(11) 90000-1101", "Escova", "10/09/2026", "", "", "", "", ""],
        ["", "123", "", "31/02/2026", "", "", "", "", ""],
        ["Carla", "(11) 90000-1199", "", "01/01/2099", "", "", "", "", ""],
        ["Dani", "(11) 90000-1188", "", "", "", "", "", "", ""],
      ],
      guessMapping(headers),
    );
    const out = validateImportRows(rows, new Set(["+5511900001188"]), "2026-10-28");
    expect(out[0]).toMatchObject({ errors: [], consent: "granted", amountCents: 18000, lastVisit: "2026-06-15", duplicateOf: null });
    expect(out[1].warnings.join(" ")).toMatch(/Sem data da última visita/);
    expect(out[2].duplicateOf).toBe("file");
    expect(out[3].errors.length).toBe(3); // nome, telefone e data
    expect(out[4].errors.join(" ")).toMatch(/futuro/);
    expect(out[5].duplicateOf).toBe("existing");
  });
});
