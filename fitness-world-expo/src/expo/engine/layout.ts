// Planta do pavilhão (metros). O visitante entra pelo lobby (z positivo) e
// caminha em direção ao Palco Principal (z negativo).

export const HALL = { minX: -54, maxX: 54, minZ: -82, maxZ: 24, height: 15 };

export const SPAWN = { x: 0, z: 18, yaw: 0 };

export interface Slot {
  id: string;
  label: string;
  x: number;
  z: number;
  w: number;
  d: number;
  /** Rotação do estande: a frente (+Z local) aponta para o corredor de acesso. */
  rot: number;
  row: 'A' | 'B';
  side: 'esquerda' | 'direita';
}

const W = 15;
const D = 15;

export const SLOTS: Slot[] = [
  { id: 'A1', label: 'A1', x: -17, z: -12, w: W, d: D, rot: Math.PI / 2, row: 'A', side: 'esquerda' },
  { id: 'A2', label: 'A2', x: 17, z: -12, w: W, d: D, rot: -Math.PI / 2, row: 'A', side: 'direita' },
  { id: 'A3', label: 'A3', x: -38, z: -12, w: W, d: D, rot: Math.PI / 2, row: 'A', side: 'esquerda' },
  { id: 'A4', label: 'A4', x: 38, z: -12, w: W, d: D, rot: -Math.PI / 2, row: 'A', side: 'direita' },
  { id: 'B1', label: 'B1', x: -17, z: -40, w: W, d: D, rot: Math.PI / 2, row: 'B', side: 'esquerda' },
  { id: 'B2', label: 'B2', x: 17, z: -40, w: W, d: D, rot: -Math.PI / 2, row: 'B', side: 'direita' },
  { id: 'B3', label: 'B3', x: -38, z: -40, w: W, d: D, rot: Math.PI / 2, row: 'B', side: 'esquerda' },
  { id: 'B4', label: 'B4', x: 38, z: -40, w: W, d: D, rot: -Math.PI / 2, row: 'B', side: 'direita' },
];

export const slotById = (id: string | null | undefined) => SLOTS.find((s) => s.id === id);

/** Ponto de chegada em frente ao estande (para o "Ir até lá"). */
export function approachPoint(slot: Slot) {
  const fx = Math.sin(slot.rot);
  const fz = Math.cos(slot.rot);
  const dist = slot.w / 2 + 3.5;
  return { x: slot.x + fx * dist, z: slot.z + fz * dist, yaw: Math.atan2(fx, fz) };
}

export const STAGE = { x: 0, z: -73, w: 26, d: 11, h: 1.2 };
export const LAUNCH_PODIUM = { x: 0, z: -26 };

export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Transforma uma caixa local (centro cx,cz, tamanho w,d) para o mundo, com rotação múltipla de 90°. */
export function localBoxToWorld(slot: Pick<Slot, 'x' | 'z' | 'rot'>, cx: number, cz: number, w: number, d: number): AABB {
  const c = Math.round(Math.cos(slot.rot));
  const s = Math.round(Math.sin(slot.rot));
  // rotação em torno de Y: x' = x cos + z sin ; z' = -x sin + z cos
  const wx = slot.x + cx * c + cz * s;
  const wz = slot.z - cx * s + cz * c;
  const ww = Math.abs(c) ? w : d;
  const wd = Math.abs(c) ? d : w;
  return { minX: wx - ww / 2, maxX: wx + ww / 2, minZ: wz - wd / 2, maxZ: wz + wd / 2 };
}
