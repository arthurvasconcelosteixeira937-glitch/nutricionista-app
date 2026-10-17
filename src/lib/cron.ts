import "server-only";
import { timingSafeEqual } from "node:crypto";
import { env } from "./env";

/** A Vercel envia "Authorization: Bearer <CRON_SECRET>" nas chamadas de cron. */
export function isAuthorizedCron(request: Request): boolean {
  const secret = env.cronSecret();
  if (!secret) return false;
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return got.length === expected.length && timingSafeEqual(got, expected);
}
