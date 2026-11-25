import type { Session } from '../types';
import { EX } from './plan';
import { lastEntries } from './progression';

const best = (e: { sets: { kg: number | null; reps: number | null; done: boolean }[] }) =>
  Math.max(0, ...e.sets.filter((x) => x.done).map((x) => (x.kg ?? 0) * (1 + (x.reps ?? 0) / 30)));

/** Lifts whose best set has gone up, held, or dropped over the last two sessions. */
export function liftTrends(sessions: Session[]): { up: string[]; flat: string[]; down: string[] } {
  const ids = [...new Set(sessions.slice(-12).flatMap((sn) => sn.entries.map((e) => e.exId)))].filter((id) => EX[id]?.compound && !EX[id]?.bodyweight);
  const out = { up: [] as string[], flat: [] as string[], down: [] as string[] };
  for (const id of ids) {
    const [last, prev] = lastEntries(sessions, id, 2);
    if (!last || !prev) continue;
    const a = best(last), b = best(prev);
    if (!a || !b) continue;
    (a > b * 1.005 ? out.up : a < b * 0.995 ? out.down : out.flat).push(EX[id].name);
  }
  return out;
}

