import "server-only";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema";
import { seedDemoIfEmpty } from "./seed";

type Param = SQLInputValue | boolean | undefined;

type GlobalWithDb = typeof globalThis & { __assistenteDb?: DatabaseSync };

function databasePath(): string {
  return process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "assistente.db");
}

function open(): DatabaseSync {
  const file = databasePath();
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA_SQL);
  db.prepare("INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', ?)").run(
    String(SCHEMA_VERSION),
  );
  return db;
}

export function getDb(): DatabaseSync {
  const g = globalThis as GlobalWithDb;
  if (!g.__assistenteDb) {
    g.__assistenteDb = open();
    if (process.env.SEED_DEMO !== "false") seedDemoIfEmpty(g.__assistenteDb);
  }
  return g.__assistenteDb;
}

/** Fecha e descarta a conexão atual (usado por scripts e testes). */
export function closeDb(): void {
  const g = globalThis as GlobalWithDb;
  g.__assistenteDb?.close();
  g.__assistenteDb = undefined;
}

function normalize(params: Param[]): SQLInputValue[] {
  return params.map((p) => {
    if (p === undefined) return null;
    if (typeof p === "boolean") return p ? 1 : 0;
    return p;
  });
}

export function all<T>(sql: string, ...params: Param[]): T[] {
  return getDb().prepare(sql).all(...normalize(params)) as T[];
}

export function get<T>(sql: string, ...params: Param[]): T | undefined {
  return getDb().prepare(sql).get(...normalize(params)) as T | undefined;
}

export function run(sql: string, ...params: Param[]): { changes: number } {
  const r = getDb().prepare(sql).run(...normalize(params));
  return { changes: Number(r.changes) };
}

let txDepth = 0;

/** Executa fn numa transação. Chamadas aninhadas reutilizam a transação externa. */
export function transaction<T>(fn: () => T): T {
  const db = getDb();
  if (txDepth > 0) return fn();
  db.exec("BEGIN IMMEDIATE");
  txDepth++;
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  } finally {
    txDepth--;
  }
}
