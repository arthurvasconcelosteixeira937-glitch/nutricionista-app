import { useSyncExternalStore } from 'react';
import type { ExpoState } from '@/domain/types';
import { createSeedState, STATE_VERSION } from './seed';

// Armazenamento LOCAL do protótipo.
// - Persistência: localStorage deste navegador (não é um banco de dados real).
// - Sincronização entre abas: evento `storage` (ex.: a marca edita o estande no
//   painel e a aba da feira 3D se atualiza).
// Em produção, este módulo é substituído por um cliente de API/backend
// (ver docs/ARQUITETURA.md e docs/schema.sql) sem alterar as telas, que
// consomem os dados apenas via `useExpo()` e `repositories.ts`.

const KEY = 'fwe:state';
type Listener = () => void;

let state: ExpoState = load();
const listeners = new Set<Listener>();

function load(): ExpoState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ExpoState;
      if (parsed.version === STATE_VERSION) return parsed;
    }
  } catch {
    /* armazenamento indisponível: usa dados iniciais em memória */
  }
  const seed = createSeedState();
  persist(seed);
  return seed;
}

function persist(s: ExpoState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch (err) {
    console.warn('[store] Falha ao salvar no localStorage (limite de espaço?)', err);
  }
}

function emit() {
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      const next = JSON.parse(e.newValue) as ExpoState;
      if (next.version === STATE_VERSION) {
        state = next;
        emit();
      }
    } catch {
      /* ignora */
    }
  });
}

export function getState(): ExpoState {
  return state;
}

export function setState(updater: (s: ExpoState) => ExpoState) {
  state = updater(state);
  persist(state);
  emit();
}

export function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function resetState() {
  state = createSeedState();
  persist(state);
  emit();
}

export function useExpo(): ExpoState;
export function useExpo<T>(selector: (s: ExpoState) => T): T;
export function useExpo<T>(selector?: (s: ExpoState) => T) {
  const s = useSyncExternalStore(subscribe, getState, getState);
  return selector ? selector(s) : s;
}
