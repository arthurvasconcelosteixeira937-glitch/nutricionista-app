// Apaga o banco local. Na próxima inicialização ele é recriado (e, com SEED_DEMO != "false",
// recebe novamente as contas e os dados FICTÍCIOS de demonstração).
import fs from "node:fs";
import path from "node:path";

const file = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "assistente.db");
for (const f of [file, `${file}-wal`, `${file}-shm`]) fs.rmSync(f, { force: true });
console.log(`Banco removido: ${file}. Reinicie o servidor para recriá-lo.`);
