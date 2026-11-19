import { useSyncExternalStore } from 'react';
import { uid } from '@/lib/util';

// AUTENTICAÇÃO DEMONSTRATIVA — NÃO É SEGURA.
// O protótipo permite "entrar" como uma marca ou como administrador apenas
// escolhendo a conta. O isolamento de dados por empresa é aplicado na camada
// de repositórios (repositories.ts), mas como tudo roda no navegador, não há
// garantia de segurança. Em produção: autenticação real (ex.: Supabase Auth /
// Auth0) + regras no servidor (RLS) — ver docs/schema.sql.

export type Session =
  | { role: 'admin'; name: string }
  | { role: 'brand'; brandId: string; name: string }
  | null;

const SKEY = 'fwe:session';
const VKEY = 'fwe:visitor';
const listeners = new Set<() => void>();

function readSession(): Session {
  try {
    const raw = localStorage.getItem(SKEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

let session: Session = readSession();
let sessionRaw = JSON.stringify(session);

window.addEventListener('storage', (e) => {
  if (e.key === SKEY) {
    session = readSession();
    sessionRaw = JSON.stringify(session);
    listeners.forEach((l) => l());
  }
});

export function getSession(): Session {
  return session;
}

export function signIn(s: NonNullable<Session>) {
  session = s;
  sessionRaw = JSON.stringify(s);
  localStorage.setItem(SKEY, sessionRaw);
  listeners.forEach((l) => l());
}

export function signOut() {
  session = null;
  sessionRaw = 'null';
  localStorage.removeItem(SKEY);
  listeners.forEach((l) => l());
}

export function useSession(): Session {
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => sessionRaw,
  );
  return session;
}

export interface VisitorIdentity {
  id: string;
  name: string;
}

export function getVisitor(): VisitorIdentity {
  try {
    const raw = localStorage.getItem(VKEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignora */
  }
  const id = uid('v-');
  const v = { id, name: `Visitante ${id.slice(-4).toUpperCase()}` };
  try {
    localStorage.setItem(VKEY, JSON.stringify(v));
  } catch {
    /* ignora */
  }
  return v;
}

export function setVisitorName(name: string) {
  const v = { ...getVisitor(), name: name.trim().slice(0, 32) || getVisitor().name };
  localStorage.setItem(VKEY, JSON.stringify(v));
  return v;
}
