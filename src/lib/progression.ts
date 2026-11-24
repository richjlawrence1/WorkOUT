import type { PlanDay, Session, SessionEntry, SetLog } from '../types';
import { EX } from './plan';

/** Smallest sensible jump for the kit an exercise uses. */
export const increment = (exId: string): number => {
  const ex = EX[exId];
  if (!ex) return 2.5;
  if (ex.equipment.includes('dumbbells') || ex.equipment.includes('kettlebell')) return 2;
  if (ex.equipment.includes('barbell') && ['squat', 'hinge', 'glute'].includes(ex.slot)) return 5;
  return 2.5;
};

const roundTo = (kg: number, step: number) => Math.max(step, Math.round(kg / step) * step);

export const lastEntries = (sessions: Session[], exId: string, n = 2): SessionEntry[] => {
  const out: SessionEntry[] = [];
  for (let i = sessions.length - 1; i >= 0 && out.length < n; i--) {
    const e = sessions[i].entries.find((x) => x.exId === exId && x.sets.some((st) => st.done));
    if (e) out.push(e);
  }
  return out;
};

const doneSets = (e: SessionEntry) => e.sets.filter((st) => st.done && st.reps != null);

export interface Target {
  kg: number | null;
  reps: number;
  note: string;
  trend: 'up' | 'same' | 'down' | 'new';
}

/**
 * Double progression: earn reps inside the range first, then add load.
 *  - every set reached the top of the range  -> add weight, restart at the bottom
 *  - two sessions running below the range     -> take 10% off and rebuild
 *  - otherwise                                -> same weight, aim for one more rep
 */
export function nextTarget(sessions: Session[], exId: string, repMin: number, repMax: number): Target {
  const ex = EX[exId];
  const [last, prev] = lastEntries(sessions, exId, 2);
  const unit = ex?.timed ? 'sec' : 'reps';
  if (!last) {
    return {
      kg: null,
      reps: repMin,
      trend: 'new',
      note: ex?.bodyweight
        ? `First time. Aim for ${repMin}-${repMax} ${unit} with clean form.`
        : `First time. Pick a weight you could lift for about ${repMax + 2} reps and log it. I'll take it from there.`,
    };
  }
  const sets = doneSets(last);
  const reps = sets.map((st) => st.reps as number);
  const worst = Math.min(...reps);
  const kg = Math.max(...sets.map((st) => st.kg ?? 0)) || null;
  const step = increment(exId);

  if (ex?.bodyweight && !kg) {
    if (worst >= repMax) {
      return { kg: null, reps: repMax, trend: 'up', note: `You hit ${repMax} ${unit} on every set. Slow the lowering phase to 3 seconds, or add a set.` };
    }
    return { kg: null, reps: Math.min(repMax, worst + 1), trend: 'up', note: `Last time ${reps.join(', ')}. Beat it by one ${unit === 'sec' ? 'second or more' : 'rep'} per set.` };
  }
  if (kg == null) return { kg: null, reps: repMin, trend: 'new', note: 'Log a weight to start tracking progression.' };

  if (worst >= repMax) {
    return { kg: kg + step, reps: repMin, trend: 'up', note: `All sets hit ${repMax} at ${kg} kg. Up ${step} kg today.` };
  }
  const prevSets = prev ? doneSets(prev) : [];
  const prevMissed = prevSets.length > 0 && Math.min(...prevSets.map((st) => st.reps as number)) < repMin && Math.max(...prevSets.map((st) => st.kg ?? 0)) >= kg;
  if (worst < repMin && prevMissed) {
    const lighter = roundTo(kg * 0.9, step);
    return { kg: lighter, reps: repMax - 1, trend: 'down', note: `Two sessions under ${repMin} reps at ${kg} kg. Dropping to ${lighter} kg to rebuild momentum.` };
  }
  const target = Math.min(repMax, Math.max(repMin, worst + 1));
  return { kg, reps: target, trend: 'same', note: `Last time ${kg} kg × ${reps.join(', ')}. Same weight, aim for ${target} on every set.` };
}

export function buildEntries(day: PlanDay, sessions: Session[]): SessionEntry[] {
  return day.exercises.map((pe) => {
    const t = nextTarget(sessions, pe.exId, pe.repMin, pe.repMax);
    const sets: SetLog[] = Array.from({ length: pe.sets }, () => ({ kg: t.kg, reps: t.reps, done: false }));
    return { exId: pe.exId, repMin: pe.repMin, repMax: pe.repMax, note: t.note, sets };
  });
}

/** Epley estimated one-rep max. */
export const e1rm = (kg: number, reps: number) => (reps <= 1 ? kg : kg * (1 + reps / 30));

export const sessionVolume = (sn: Session): number =>
  sn.entries.reduce((v, e) => v + e.sets.reduce((a, st) => a + (st.done ? (st.kg ?? 0) * (st.reps ?? 0) : 0), 0), 0);

export const bestE1rm = (sessions: Session[], exId: string): number =>
  sessions.reduce((best, sn) => {
    const e = sn.entries.find((x) => x.exId === exId);
    if (!e) return best;
    return Math.max(best, ...e.sets.filter((st) => st.done && st.kg && st.reps).map((st) => e1rm(st.kg as number, st.reps as number)));
  }, 0);

/** Personal records set in `sn` compared with everything before it. */
export function sessionPRs(before: Session[], sn: Session): { exId: string; e1rm: number }[] {
  return sn.entries
    .map((e) => {
      const now = Math.max(0, ...e.sets.filter((st) => st.done && st.kg && st.reps).map((st) => e1rm(st.kg as number, st.reps as number)));
      const old = bestE1rm(before, e.exId);
      return now > 0 && old > 0 && now > old + 0.01 ? { exId: e.exId, e1rm: now } : null;
    })
    .filter((x): x is { exId: string; e1rm: number } => !!x);
}
