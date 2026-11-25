// The coach's weekly prescription outside the weights: cardio, steps and the
// rep focus of the current training block.
import type { Goal, PlanDay, PlanExercise, WeightEntry } from '../types';
import { fromKey } from './dates';
import { EX } from './plan';
import { targetRate } from './nutrition';

export type Phase = 'standard' | 'heavy' | 'recovery';
export const CARDIO_MAX = 45;
export const STEPS_MAX = 12000;

export const PHASE_LABEL: Record<Phase, string> = {
  standard: 'Standard reps',
  heavy: 'Fewer reps, heavier',
  recovery: 'Recovery week',
};

export const initialCardio = (goal: Goal): number => (goal === 'lose' ? 15 : goal === 'recomp' ? 15 : 10);
export const initialSteps = (goal: Goal): number => (goal === 'lose' || goal === 'recomp' ? 8000 : 7000);

export const CARDIO_TYPES = ['Incline walk', 'Bike', 'Cross-trainer', 'Rower', 'Stair climber', 'Run', 'Outdoor walk'];

/** Applies the current block to one prescribed exercise. */
export function applyPhase(pe: PlanExercise, phase: Phase): PlanExercise {
  const ex = EX[pe.exId];
  if (!ex || ex.timed || phase === 'standard') return pe;
  if (phase === 'recovery') return { ...pe, sets: Math.max(2, pe.sets - 1) };
  // Heavy block: compounds drop two reps so the load can climb. Isolation work stays put.
  if (!ex.compound || ex.bodyweight) return pe;
  return { ...pe, repMin: Math.max(4, pe.repMin - 2), repMax: Math.max(6, pe.repMax - 2) };
}
export const phasedDay = (day: PlanDay, phase: Phase): PlanDay =>
  phase === 'standard' ? day : { ...day, exercises: day.exercises.map((e) => applyPhase(e, phase)) };

/** Five-minute warm-up matched to what the session trains. */
export function warmupFor(day: PlanDay): string[] {
  const slots = new Set(day.exercises.map((e) => e.slot));
  const lower = ['squat', 'hinge', 'lunge', 'quad_iso', 'ham_curl', 'glute'].some((x) => slots.has(x as never));
  const upper = ['chest_press', 'incline_press', 'shoulder_press', 'row', 'pulldown'].some((x) => slots.has(x as never));
  const out = ['3 minutes easy on a bike, rower or brisk walk until you feel warm'];
  if (upper) out.push('10 arm circles each way, then 10 band pull-aparts or wall slides', '8 slow push-ups or scapular push-ups');
  if (lower) out.push('10 bodyweight squats with a pause at the bottom', '8 leg swings each leg, then 8 glute bridges');
  if (!upper && !lower) out.push('10 bodyweight squats', '10 arm circles each way');
  return out;
}

/** Weekly rate of change in kg from the recent trend (least squares). Null without enough data. */
export function weeklyRate(weights: WeightEntry[]): number | null {
  const cutoff = Date.now() - 28 * 864e5;
  const pts = weights.filter((w) => fromKey(w.date).getTime() >= cutoff).map((w) => [fromKey(w.date).getTime() / 864e5, w.kg]);
  if (pts.length < 3 || pts[pts.length - 1][0] - pts[0][0] < 6) return null;
  const mx = pts.reduce((a, p) => a + p[0], 0) / pts.length, my = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  const den = pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
  if (!den) return null;
  return (pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / den) * 7;
}

/** When the goal weight will be reached, from the real trend if there is one, else from the planned pace. */
export function projection(current: number, target: number, goal: Goal, weights: WeightEntry[]): { weeks: number; date: Date; fromTrend: boolean } | null {
  const toGo = target - current;
  if (Math.abs(toGo) < 0.2) return null;
  const trend = weeklyRate(weights);
  const [lo, hi] = targetRate(goal);
  const planned = ((lo + hi) / 2) * current || (toGo < 0 ? -0.005 : 0.0025) * current;
  const useTrend = trend != null && Math.sign(trend) === Math.sign(toGo) && Math.abs(trend) > 0.05;
  const rate = useTrend ? (trend as number) : Math.sign(planned) === Math.sign(toGo) ? planned : Math.sign(toGo) * Math.abs(current * 0.004);
  const weeks = Math.min(104, Math.max(1, Math.ceil(toGo / rate)));
  return { weeks, date: new Date(Date.now() + weeks * 7 * 864e5), fromTrend: useTrend };
}
