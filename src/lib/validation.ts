import { isValidUSPhone, toCents } from "./format";

export type Errors<T extends string = string> = Partial<Record<T, string>>;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(v: string): string | undefined {
  if (!v.trim()) return "Escribe tu correo.";
  if (!EMAIL_RE.test(v.trim())) return "Este correo no es válido.";
}

export function validatePassword(v: string): string | undefined {
  if (!v) return "Escribe una contraseña.";
  if (v.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
}

export function validateRequired(v: string, message: string, max = 80): string | undefined {
  if (!v.trim()) return message;
  if (v.trim().length > max) return `Máximo ${max} caracteres.`;
}

export function validatePhone(v: string): string | undefined {
  if (!v.trim()) return "Escribe el teléfono del cliente.";
  if (!isValidUSPhone(v)) return "Teléfono no válido. Usa 10 dígitos, ej: (555) 123-4567.";
}

/** Convierte "1,250.50" o "$80" a número. Devuelve NaN si no es válido. */
export function parseAmount(v: string): number {
  const clean = v.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(clean)) return NaN;
  return Number(clean);
}

export function validateAmount(v: string, max?: number): string | undefined {
  if (!v.trim()) return "Escribe el monto.";
  const n = parseAmount(v);
  if (Number.isNaN(n)) return "Monto no válido. Ej: 120 o 120.50";
  if (n <= 0) return "El monto debe ser mayor a $0.";
  if (n > 1_000_000) return "El monto es demasiado alto.";
  if (max !== undefined && toCents(n) > toCents(max)) return `No puede ser mayor a lo que falta ($${max.toFixed(2)}).`;
}

export function validateDate(v: string, message = "Elige una fecha."): string | undefined {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return message;
}

export function normalizeVenmo(v: string) {
  return v.trim().replace(/^@+/, "");
}

export function normalizeCashtag(v: string) {
  return v.trim().replace(/^\$+/, "");
}

export function validateVenmo(v: string): string | undefined {
  const s = normalizeVenmo(v);
  if (s && !/^[A-Za-z0-9_-]{2,30}$/.test(s)) return "Usuario de Venmo no válido. Ej: @maria-lopez";
}

export function validateCashtag(v: string): string | undefined {
  const s = normalizeCashtag(v);
  if (s && !/^[A-Za-z0-9_]{1,20}$/.test(s)) return "Cashtag no válido. Ej: $marialopez";
  if (s && !/[A-Za-z]/.test(s)) return "El cashtag debe tener al menos una letra.";
}

export function validateZelle(v: string): string | undefined {
  const s = v.trim();
  if (!s) return;
  if (EMAIL_RE.test(s) || isValidUSPhone(s)) return;
  return "Escribe el correo o teléfono de Zelle.";
}

export function hasErrors(errors: Record<string, string | undefined>) {
  return Object.values(errors).some(Boolean);
}

/** Traduce errores de Supabase/Postgres a mensajes claros en español. */
export function friendlyError(error: unknown): string {
  const e = error as { message?: string; code?: string; status?: number } | null;
  const msg = (e?.message ?? "").toLowerCase();
  const code = e?.code ?? "";

  if (code === "invalid_credentials" || msg.includes("invalid login credentials"))
    return "Correo o contraseña incorrectos.";
  if (code === "email_not_confirmed" || msg.includes("email not confirmed"))
    return "Confirma tu correo primero. Revisa tu bandeja de entrada.";
  if (code === "user_already_exists" || msg.includes("already registered"))
    return "Ya existe una cuenta con este correo. Inicia sesión.";
  if (code === "weak_password" || msg.includes("password should"))
    return "La contraseña es muy débil. Usa al menos 8 caracteres.";
  if (code === "same_password") return "La nueva contraseña debe ser diferente a la anterior.";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || msg.includes("rate limit"))
    return "Demasiados intentos. Espera unos minutos y vuelve a intentar.";
  if (msg.includes("payment_exceeds_balance")) return "El pago es mayor a lo que falta por cobrar.";
  if (msg.includes("failed to fetch") || msg.includes("network"))
    return "Sin conexión. Revisa tu internet e intenta de nuevo.";
  if (code === "23514") return "Algún dato no es válido. Revisa el formulario.";
  if (code === "42501") return "No tienes permiso para hacer esto.";
  return "Algo salió mal. Intenta de nuevo.";
}
