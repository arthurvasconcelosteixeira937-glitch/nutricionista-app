"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Checkbox, LinkButton, Select, Table, Td, Th } from "@/components/ui";
import { applyMapping, guessMapping, IMPORT_FIELDS, MAX_IMPORT_ROWS, type ColumnMapping, type ValidatedImportRow } from "@/lib/domain/import";
import { parseCsv } from "@/lib/domain/csv";
import { formatDateBR } from "@/lib/domain/dates";
import { formatPhoneBR } from "@/lib/domain/phone";
import { formatBRL } from "@/lib/domain/money";
import { CONSENT_LABELS } from "@/lib/domain/labels";
import { commitImportAction, previewImportAction } from "../actions";

type Step = "file" | "mapping" | "preview" | "done";
const MAX_BYTES = 2 * 1024 * 1024;

async function readFileText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  // Planilhas do Excel em português costumam vir em Windows-1252.
  return utf8.includes("�") ? new TextDecoder("windows-1252").decode(buffer) : utf8;
}

export function ImportWizard() {
  const [step, setStep] = useState<Step>("file");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [preview, setPreview] = useState<ValidatedImportRow[]>([]);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; skippedInvalid: number; skippedDuplicates: number } | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setStep("file");
    setFileName("");
    setHeaders([]);
    setDataRows([]);
    setMapping({});
    setPreview([]);
    setConsentConfirmed(false);
    setError(null);
    setResult(null);
  }

  async function onFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!/\.(csv|txt)$/i.test(file.name)) return setError("Envie um arquivo .csv.");
    if (file.size > MAX_BYTES) return setError("Arquivo maior que 2 MB. Divida a planilha em partes.");
    const text = await readFileText(file);
    const rows = parseCsv(text);
    if (rows.length < 2) return setError("A planilha precisa ter uma linha de cabeçalho e ao menos uma linha de dados.");
    if (rows.length - 1 > MAX_IMPORT_ROWS) return setError(`A planilha tem ${rows.length - 1} linhas. O limite é ${MAX_IMPORT_ROWS} por importação.`);
    setFileName(file.name);
    setHeaders(rows[0].map((h, i) => h.trim() || `Coluna ${i + 1}`));
    setDataRows(rows.slice(1));
    setMapping(guessMapping(rows[0]));
    setStep("mapping");
  }

  const mappedRaw = useMemo(() => applyMapping(dataRows, mapping), [dataRows, mapping]);
  const missingRequired = IMPORT_FIELDS.filter((f) => f.required && mapping[f.key] == null);

  function validate() {
    setError(null);
    startTransition(async () => {
      const r = await previewImportAction(mappedRaw);
      if (!r.ok) return setError(r.message);
      setPreview(r.rows);
      setStep("preview");
    });
  }

  function commit() {
    setError(null);
    startTransition(async () => {
      const r = await commitImportAction(mappedRaw, fileName, consentConfirmed);
      if (!r.ok) return setError(r.message);
      setResult(r.result);
      setStep("done");
    });
  }

  const counts = useMemo(() => {
    const invalid = preview.filter((r) => r.errors.length > 0).length;
    const dup = preview.filter((r) => r.errors.length === 0 && r.duplicateOf).length;
    return { invalid, dup, ok: preview.length - invalid - dup, warnings: preview.filter((r) => r.warnings.length > 0).length };
  }, [preview]);
  const consentMapped = mapping.consent != null;
  const grantedCount = preview.filter((r) => r.consent === "granted" && r.errors.length === 0 && !r.duplicateOf).length;

  const stepLabels: [Step, string][] = [
    ["file", "Arquivo"],
    ["mapping", "Colunas"],
    ["preview", "Prévia"],
    ["done", "Concluído"],
  ];

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2 text-sm" aria-label="Etapas da importação">
        {stepLabels.map(([s, label], i) => (
          <li
            key={s}
            aria-current={step === s ? "step" : undefined}
            className={`rounded-full px-3 py-1 ${step === s ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {error && <Alert tone="danger">{error}</Alert>}

      {step === "file" && (
        <Card>
          <CardBody className="py-8">
            <label htmlFor="csv" className="block text-sm font-medium text-slate-800">
              Selecione o arquivo CSV
            </label>
            <input
              id="csv"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => onFile(e.target.files?.[0])}
              className="mt-2 block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-brand-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-800"
            />
            <p className="mt-3 text-xs text-slate-500">
              Aceita separador vírgula ou ponto e vírgula. Datas como 31/12/2025. Colunas mínimas: nome e telefone.
            </p>
          </CardBody>
        </Card>
      )}

      {step === "mapping" && (
        <Card>
          <CardHeader
            title="Relacione as colunas da planilha"
            description={`${fileName} · ${dataRows.length} linha(s) de dados. Sugerimos um mapeamento; confira antes de seguir.`}
          />
          <CardBody className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {IMPORT_FIELDS.map((f) => (
                <div key={f.key}>
                  <label htmlFor={`map-${f.key}`} className="mb-1 block text-sm font-medium text-slate-800">
                    {f.label}
                    {f.required && <span className="text-red-700"> *</span>}
                  </label>
                  <Select
                    id={`map-${f.key}`}
                    value={mapping[f.key] ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setMapping((m) => ({ ...m, [f.key]: v === "" ? undefined : Number(v) }));
                    }}
                  >
                    <option value="">Não importar</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-800">Primeiras linhas como serão lidas</p>
              <Table>
                <thead className="bg-slate-50">
                  <tr>
                    {IMPORT_FIELDS.filter((f) => mapping[f.key] != null).map((f) => (
                      <Th key={f.key}>{f.label}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mappedRaw.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      {IMPORT_FIELDS.filter((f) => mapping[f.key] != null).map((f) => (
                        <Td key={f.key}>{r[f.key] || <span className="text-slate-400">—</span>}</Td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {missingRequired.length > 0 && (
              <Alert tone="warning">Relacione as colunas obrigatórias: {missingRequired.map((f) => f.label).join(", ")}.</Alert>
            )}
            <div className="flex flex-wrap justify-between gap-2">
              <Button variant="ghost" onClick={reset}>
                Cancelar importação
              </Button>
              <Button onClick={validate} disabled={pending || missingRequired.length > 0}>
                {pending ? "Validando…" : "Validar dados"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === "preview" && (
        <Card>
          <CardHeader title="Prévia da importação" description="Nada foi gravado ainda. Revise o resultado da validação." />
          <CardBody className="space-y-4">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge tone="success">{counts.ok} serão importadas</Badge>
              <Badge tone="danger">{counts.invalid} com erro (ignoradas)</Badge>
              <Badge tone="warning">{counts.dup} possíveis duplicidades (ignoradas)</Badge>
              <Badge tone="neutral">{counts.warnings} com avisos</Badge>
            </div>
            {consentMapped && grantedCount > 0 && (
              <Alert tone="warning" title="Autorização de mensagens">
                {grantedCount} cliente(s) estão marcadas na planilha como “autorizou mensagens”. Só confirme se essa autorização
                foi de fato dada pelas clientes.
                <div className="mt-2">
                  <Checkbox
                    checked={consentConfirmed}
                    onChange={(e) => setConsentConfirmed(e.target.checked)}
                    label="Confirmo que as autorizações da planilha refletem o consentimento real das clientes."
                  />
                </div>
              </Alert>
            )}
            <Table>
              <thead className="bg-slate-50">
                <tr>
                  <Th>Linha</Th>
                  <Th>Situação</Th>
                  <Th>Nome</Th>
                  <Th>Telefone</Th>
                  <Th>Serviço / última visita</Th>
                  <Th>Autorização</Th>
                  <Th>Observações da validação</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.map((r) => (
                  <tr key={r.line} className={r.errors.length ? "bg-red-50/50" : r.duplicateOf ? "bg-amber-50/50" : undefined}>
                    <Td className="tabular-nums text-slate-500">{r.line}</Td>
                    <Td>
                      {r.errors.length > 0 ? (
                        <Badge tone="danger">Erro</Badge>
                      ) : r.duplicateOf ? (
                        <Badge tone="warning">{r.duplicateOf === "existing" ? "Já cadastrada" : "Repetida no arquivo"}</Badge>
                      ) : (
                        <Badge tone="success">OK</Badge>
                      )}
                    </Td>
                    <Td>{r.name || "—"}</Td>
                    <Td className="whitespace-nowrap tabular-nums">{r.phone ? formatPhoneBR(r.phone) : "—"}</Td>
                    <Td>
                      {r.service ?? "—"}
                      {r.lastVisit && <span className="block text-xs text-slate-500">{formatDateBR(r.lastVisit)}</span>}
                      {r.amountCents != null && <span className="block text-xs text-slate-500">{formatBRL(r.amountCents)}</span>}
                    </Td>
                    <Td className="whitespace-nowrap">{CONSENT_LABELS[r.consent]}</Td>
                    <Td className="text-xs">
                      {[...r.errors, ...r.warnings].length === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <ul className="space-y-0.5">
                          {r.errors.map((e) => (
                            <li key={e} className="text-red-800">
                              {e}
                            </li>
                          ))}
                          {r.duplicateOf && (
                            <li className="text-amber-900">
                              {r.duplicateOf === "existing"
                                ? "Telefone já cadastrado: a linha será ignorada."
                                : "Telefone repetido em outra linha do arquivo: só a primeira será importada."}
                            </li>
                          )}
                          {r.warnings.map((w) => (
                            <li key={w} className="text-slate-600">
                              {w}
                            </li>
                          ))}
                        </ul>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="flex flex-wrap justify-between gap-2">
              <div className="flex gap-2">
                <Button variant="ghost" onClick={reset}>
                  Cancelar importação
                </Button>
                <Button variant="secondary" onClick={() => setStep("mapping")}>
                  Voltar ao mapeamento
                </Button>
              </div>
              <Button
                onClick={commit}
                disabled={pending || counts.ok === 0 || (consentMapped && grantedCount > 0 && !consentConfirmed)}
              >
                {pending ? "Importando…" : `Importar ${counts.ok} cliente(s)`}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === "done" && result && (
        <Card>
          <CardBody className="space-y-4 py-6">
            <Alert tone="success" title="Importação concluída">
              {result.imported} cliente(s) cadastrada(s). {result.skippedInvalid} linha(s) com erro e {result.skippedDuplicates}{" "}
              duplicidade(s) foram ignoradas. Nenhuma mensagem foi enviada.
            </Alert>
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/clientes">Ver clientes</LinkButton>
              <LinkButton href="/reativacao" variant="secondary">
                Ver quem precisa de retorno
              </LinkButton>
              <Button variant="ghost" onClick={reset}>
                Importar outro arquivo
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              A importação foi registrada no <Link href="/configuracoes#auditoria" className="underline">registro de ações</Link>.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
