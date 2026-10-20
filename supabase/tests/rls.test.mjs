// Prueba de seguridad (RLS) y reglas de la base de datos.
// Uso: DATABASE_URL=postgres://... npm run test:db
// La base debe estar VACÍA: el script carga stubs de Supabase y la migración.
import { readFileSync } from "node:fs";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL (una base de Postgres vacía, solo para pruebas).");
  process.exit(1);
}
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const root = new URL("../", import.meta.url);
await db.query(readFileSync(new URL("tests/supabase-stubs.sql", root), "utf8"));
await db.query(readFileSync(new URL("migrations/0001_init.sql", root), "utf8"));
let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) { pass++; console.log("  ✓", name); } else { fail++; console.log("  ✗", name); } };
const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";

async function as(uid, fn) {
  await db.query("begin");
  try {
    if (uid) { await db.query("set local role authenticated"); await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid]); }
    else await db.query("set local role anon");
    const r = await fn();
    await db.query("commit");
    return r;
  } catch (e) { await db.query("rollback"); throw e; }
}
async function fails(uid, sql, params, name, match) {
  try { await as(uid, () => db.query(sql, params)); ok(false, name + " (no error)"); }
  catch (e) { ok(!match || e.message.toLowerCase().includes(match), `${name} → ${e.message}`); }
}

await db.query("truncate auth.users cascade");
await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1,'a@x.com','{"full_name":"María López"}'), ($2,'b@x.com','{}')`, [A, B]);
const prof = await db.query("select full_name, trial_ends_at > now() + interval '6 days' as trial from profiles where id=$1", [A]);
ok(prof.rows[0]?.full_name === "María López" && prof.rows[0].trial, "perfil creado con nombre y 7 días de prueba");

console.log("Perfiles");
await as(A, () => db.query("update profiles set business_name='María Cleaning', venmo='maria', onboarded=true where id=$1", [A]));
ok((await db.query("select business_name from profiles where id=$1", [A])).rows[0].business_name === "María Cleaning", "usuario edita su negocio");
await fails(A, "update profiles set subscription_status='active' where id=$1", [A], "no puede activar su suscripción", "permission denied");
await fails(A, "update profiles set trial_ends_at=now()+interval '1 year' where id=$1", [A], "no puede extender la prueba", "permission denied");
const other = await as(A, () => db.query("update profiles set business_name='hack' where id=$1", [B]));
ok(other.rowCount === 0, "no puede editar el perfil de otro");
ok((await as(A, () => db.query("select * from profiles"))).rowCount === 1, "solo ve su propio perfil");
await fails(null, "select * from profiles", [], "anon no lee perfiles", "permission denied");

console.log("Clientes");
const c = await as(A, () => db.query("insert into clients (name, phone, language) values ('Jennifer', '+15551234567', 'en') returning id, user_id"));
const cid = c.rows[0].id;
ok(c.rows[0].user_id === A, "cliente se asigna al usuario");
await fails(A, "insert into clients (name, phone) values ('X', '555')", [], "teléfono inválido rechazado", "check");
await fails(A, "insert into clients (user_id, name, phone) values ($1, 'X', '+15551234567')", [B], "no puede crear clientes para otro", "permission denied");
const cb = await as(B, () => db.query("insert into clients (name, phone) values ('Pedro', '+15559876543') returning id"));
ok((await as(B, () => db.query("select * from clients"))).rowCount === 1, "B solo ve sus clientes");

console.log("Trabajos y pagos");
const j = await as(A, () => db.query("insert into jobs (client_id, description, amount, service_date, due_date) values ($1,'Limpieza',120,'2026-10-01','2026-10-05') returning id, is_paid", [cid]));
const jid = j.rows[0].id;
ok(j.rows[0].is_paid === false, "trabajo nuevo pendiente");
await fails(A, "insert into jobs (client_id, description, amount, service_date, due_date) values ($1,'x',10,'2026-10-01','2026-10-01')", [cb.rows[0].id], "no puede usar cliente de otro", "row-level security");
await fails(A, "insert into jobs (client_id, description, amount, service_date, due_date) values ($1,'x',10,'2026-10-05','2026-10-01')", [cid], "vencimiento antes del servicio rechazado", "check");
await fails(A, "update jobs set amount_paid=120 where id=$1", [jid], "no puede marcar pagado editando amount_paid", "permission denied");
await as(A, () => db.query("insert into payments (job_id, amount, method, paid_on) values ($1, 50, 'zelle', '2026-10-06')", [jid]));
let jr = (await db.query("select amount_paid, is_paid, paid_at, receipt_number from jobs where id=$1", [jid])).rows[0];
ok(Number(jr.amount_paid) === 50 && !jr.is_paid && !jr.paid_at, "pago parcial actualiza amount_paid");
await fails(A, "insert into payments (job_id, amount, method, paid_on) values ($1, 80, 'zelle', '2026-10-06')", [jid], "pago mayor al saldo rechazado", "payment_exceeds_balance");
await fails(B, "insert into payments (job_id, amount, method, paid_on) values ($1, 10, 'zelle', '2026-10-06')", [jid], "B no puede pagar trabajos de A", "");
const p2 = await as(A, () => db.query("insert into payments (job_id, amount, method, paid_on) values ($1, 70, 'efectivo', '2026-10-07') returning id", [jid]));
jr = (await db.query("select amount_paid, is_paid, paid_at, receipt_number from jobs where id=$1", [jid])).rows[0];
ok(jr.is_paid && jr.paid_at && jr.receipt_number === 1, "pago completo → pagado con recibo N.º 1");
await as(A, () => db.query("delete from payments where id=$1", [p2.rows[0].id]));
jr = (await db.query("select amount_paid, is_paid, paid_at, receipt_number from jobs where id=$1", [jid])).rows[0];
ok(!jr.is_paid && !jr.paid_at && jr.receipt_number === 1, "borrar pago vuelve a pendiente (conserva número de recibo)");
await as(A, () => db.query("insert into payments (job_id, amount, method, paid_on) values ($1, 70, 'venmo', '2026-10-08')", [jid]));
jr = (await db.query("select receipt_number from jobs where id=$1", [jid])).rows[0];
ok(jr.receipt_number === 1, "volver a pagar no cambia el número de recibo");
const j2 = await as(A, () => db.query("insert into jobs (client_id, description, amount, service_date, due_date) values ($1,'Otro',30,'2026-10-02','2026-10-02') returning id", [cid]));
await as(A, () => db.query("insert into payments (job_id, amount, method, paid_on) values ($1, 30, 'cheque', '2026-10-08')", [j2.rows[0].id]));
ok((await db.query("select receipt_number from jobs where id=$1", [j2.rows[0].id])).rows[0].receipt_number === 2, "recibos consecutivos por usuario");
ok((await db.query("select receipt_counter from profiles where id=$1", [B])).rows[0].receipt_counter === 0, "contador de B no cambia");
// Subir el monto de un trabajo pagado lo vuelve a pendiente
await as(A, () => db.query("update jobs set amount=40 where id=$1", [j2.rows[0].id]));
jr = (await db.query("select is_paid, paid_at from jobs where id=$1", [j2.rows[0].id])).rows[0];
ok(!jr.is_paid && !jr.paid_at, "subir el monto reabre el trabajo");

console.log("Cobros enviados");
await as(A, () => db.query("insert into reminders_sent (client_id, job_ids, channel, template, language, message, amount) values ($1, $2, 'whatsapp', 'amigable', 'en', 'Hi', 70)", [cid, [jid]]));
ok((await as(A, () => db.query("select count(*)::int n from reminders_sent where job_ids && $1", [[jid]]))).rows[0].n === 1, "registro de cobro y búsqueda por trabajo");
ok((await as(B, () => db.query("select * from reminders_sent"))).rowCount === 0, "B no ve cobros de A");
await fails(B, "insert into reminders_sent (client_id, channel, template, language, message) values ($1, 'sms', 'firme', 'es', 'x')", [cid], "B no puede registrar cobros a clientes de A", "row-level security");

console.log("Trabajos fijos");
const r = await as(A, () => db.query("insert into jobs (client_id, description, amount, service_date, due_date, recurrence) values ($1,'Semanal',100,'2026-10-01','2026-10-03','weekly') returning id", [cid]));
const n1 = (await as(A, () => db.query("select generate_recurring_jobs('2026-10-16') n"))).rows[0].n;
ok(n1 === 2, `crea los cobros que faltan (2) → ${n1}`);
const series = (await db.query("select service_date::text, due_date::text, next_generated, series_id from jobs where description='Semanal' order by service_date")).rows;
ok(series.map((s) => s.service_date).join() === "2026-10-01,2026-10-08,2026-10-15", "fechas semanales correctas");
ok(series[1].due_date === "2026-10-10", "mantiene los días hasta el vencimiento");
ok(series.every((s, i) => s.next_generated === (i < 2)) && series[2].series_id === r.rows[0].id, "solo el último queda activo, misma serie");
ok((await as(A, () => db.query("select generate_recurring_jobs('2026-10-16') n"))).rows[0].n === 0, "llamar otra vez no duplica");
ok((await as(B, () => db.query("select generate_recurring_jobs('2026-12-31') n"))).rows[0].n === 0, "B no genera trabajos de A");
await fails(A, "update jobs set next_generated=true where id=$1", [jid], "no puede tocar next_generated", "permission denied");
await as(A, () => db.query("insert into jobs (client_id, description, amount, service_date, due_date, recurrence) values ($1,'Mensual',200,'2026-01-31','2026-01-31','monthly')", [cid]));
await as(A, () => db.query("select generate_recurring_jobs('2026-04-01')"));
const monthly = (await db.query("select service_date::text d from jobs where description='Mensual' order by 1")).rows.map((x) => x.d);
ok(monthly.join() === "2026-01-31,2026-02-28,2026-03-31", `mensual respeta el día 31 → ${monthly.join()}`);
await as(A, () => db.query("select generate_recurring_jobs('2099-01-01') n"));
const future = (await db.query("select count(*)::int n from jobs where service_date > current_date + 1")).rows[0].n;
ok(future === 0, `no crea cobros en el futuro aunque la fecha enviada sea lejana (${future})`);
const latest = (await db.query("select max(service_date)::text d from jobs where description='Mensual'")).rows[0].d;
ok(latest === "2026-09-30", `se pone al día hasta hoy, ajustando meses cortos → ${latest}`);

console.log("Borrado en cascada");
await as(A, () => db.query("delete from clients where id=$1", [cid]));
ok((await db.query("select count(*)::int n from jobs where client_id=$1", [cid])).rows[0].n === 0, "borrar cliente borra sus trabajos");
ok((await db.query("select count(*)::int n from clients where id=$1", [cb.rows[0].id])).rows[0].n === 1, "los datos de B siguen intactos");

console.log(`\n${pass} ok, ${fail} fallas`);
await db.end();
process.exit(fail ? 1 : 0);
