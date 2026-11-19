import type { ExpoState, Season } from '@/domain/types';
import { atTime, parseYmd } from '@/lib/util';

export type SeasonPhase = 'em_breve' | 'aberta' | 'fechada_hoje' | 'encerrada';

export interface SeasonStatus {
  phase: SeasonPhase;
  /** Dia da temporada (1..N) quando dentro do período. */
  day: number | null;
  totalDays: number;
  /** Próximo momento de abertura (se houver). */
  nextOpen: Date | null;
  /** Fechamento de hoje, quando aberta. */
  closesAt: Date | null;
}

export function seasonDays(s: Season) {
  const a = parseYmd(s.startDate).getTime();
  const b = parseYmd(s.endDate).getTime();
  return Math.round((b - a) / 86400000) + 1;
}

export function seasonStatus(s: Season, now = new Date()): SeasonStatus {
  const totalDays = seasonDays(s);
  const start = atTime(s.startDate, s.dailyOpen);
  const lastClose = atTime(s.endDate, s.dailyClose);
  if (now < start) return { phase: 'em_breve', day: null, totalDays, nextOpen: start, closesAt: null };
  if (now > lastClose) return { phase: 'encerrada', day: null, totalDays, nextOpen: null, closesAt: null };
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const day = Math.round((today.getTime() - parseYmd(s.startDate).getTime()) / 86400000) + 1;
  const [oh, om] = s.dailyOpen.split(':').map(Number);
  const [ch, cm] = s.dailyClose.split(':').map(Number);
  const open = new Date(today); open.setHours(oh, om, 0, 0);
  const close = new Date(today); close.setHours(ch, cm, 0, 0);
  if (now >= open && now <= close) return { phase: 'aberta', day, totalDays, nextOpen: null, closesAt: close };
  let next = open;
  if (now > close) {
    next = new Date(open);
    next.setDate(next.getDate() + 1);
  }
  return { phase: 'fechada_hoje', day, totalDays, nextOpen: next, closesAt: null };
}

export function activeSeason(st: ExpoState): Season | undefined {
  return st.seasons.find((s) => s.id === st.activeSeasonId) ?? st.seasons[0];
}

/** Próxima temporada publicada que ainda não começou. */
export function nextSeason(st: ExpoState, now = new Date()): Season | undefined {
  return st.seasons
    .filter((s) => s.status === 'publicada' && atTime(s.startDate, s.dailyOpen) > now)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
}

export const phaseLabel: Record<SeasonPhase, string> = {
  em_breve: 'Em breve',
  aberta: 'Aberta agora',
  fechada_hoje: 'Fechada no momento',
  encerrada: 'Encerrada',
};

export function hhmmToMin(s: string) {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function isWithinShift(shifts: { day: number; start: string; end: string }[], day: number | null, now = new Date()) {
  if (!day) return false;
  const m = now.getHours() * 60 + now.getMinutes();
  return shifts.some((s) => s.day === day && m >= hhmmToMin(s.start) && m < hhmmToMin(s.end));
}
