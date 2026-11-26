// Stretch routines, the standalone mobility session, and how much mobility
// work the coach prescribes for someone's age and problem areas.
import { DRILLS, type Drill } from '../data/mobility';
import type { PlanDay, Profile } from '../types';

export const DRILL: Record<string, Drill> = Object.fromEntries(DRILLS.map((d) => [d.id, d]));
export const drillSeconds = (d: Drill) => d.seconds * (d.sides ? 2 : 1);
export const routineMinutes = (ds: Drill[]) => Math.round(ds.reduce((t, d) => t + drillSeconds(d) + 8, 0) / 60);

const LOWER = ['squat', 'hinge', 'lunge', 'quad_iso', 'ham_curl', 'glute', 'calf'];
const UPPER = ['chest_press', 'incline_press', 'chest_fly', 'shoulder_press', 'lateral', 'rear_delt', 'row', 'pulldown', 'biceps', 'triceps'];

/** About ten minutes of static stretching for what the session trained. */
export function stretchFor(day: PlanDay): Drill[] {
  const slots = day.exercises.map((e) => e.slot as string);
  const lower = slots.filter((x) => LOWER.includes(x)).length;
  const upper = slots.filter((x) => UPPER.includes(x)).length;
  const statics = DRILLS.filter((d) => !d.dynamic);
  const pick = (region: Drill['region'], n: number) => statics.filter((d) => d.region === region).slice(0, n);
  const out = lower && upper ? [...pick('upper', 3), ...pick('lower', 3), ...pick('spine', 2)]
    : lower ? [...pick('lower', 6), ...pick('spine', 2)]
    : [...pick('upper', 6), ...pick('spine', 2)];
  // Trim from the end until the routine fits in about ten minutes.
  while (out.length > 4 && routineMinutes(out) > 10) out.splice(out.length - 3, 1);
  return out;
}

/** Full-body flow: loosen up with movement, then hold the long stretches. */
export function mobilitySession(short = false): Drill[] {
  const order = [
    'arm_circles', 'standing_hip_circles', 'cat_stretch', 'worlds_greatest_stretch', 'inchworm',
    'kneeling_hip_flexor', 'seated_floor_hamstring_stretch', 'lying_glute', 'groin_and_back_stretch',
    'chest_and_front_of_shoulder_stretch', 'overhead_lat', 'upper_back_stretch', 'knee_across_the_body', 'childs_pose',
  ];
  const all = order.map((id) => DRILL[id]).filter(Boolean);
  return short ? all.filter((_, i) => [1, 2, 3, 5, 7, 9, 12, 13].includes(i)) : all;
}

/**
 * Mobility sessions per week. Joints stiffen and recover more slowly with age,
 * so the share of the week given to mobility rises with it.
 */
export function mobilityTarget(p: Pick<Profile, 'age' | 'injuries'>): number {
  const base = p.age >= 55 ? 3 : p.age >= 45 ? 2 : p.age >= 35 ? 1 : 0;
  return base === 0 && p.injuries?.length ? 1 : base;
}

/** Share of weekly training time that goes to mobility, as a whole percentage. */
export function mobilityShare(p: Pick<Profile, 'age' | 'injuries' | 'daysPerWeek' | 'sessionMins'>, stretchOn: boolean): number {
  const mob = mobilityTarget(p) * 20 + (stretchOn ? 10 * p.daysPerWeek : 0);
  const total = p.daysPerWeek * p.sessionMins + mob;
  return total ? Math.round((mob / total) * 100) : 0;
}

export const ageNote = (age: number): string | null =>
  age >= 55 ? "At your age recovery and joint health decide how long you can keep training, so mobility is a fixed part of the week and the big lifts stay at 8 reps or more."
  : age >= 50 ? 'Past 50, joints do better with slightly higher reps and regular mobility, so both are built into your week.'
  : age >= 45 ? 'From your mid-40s, mobility work is what keeps the heavy lifting comfortable, so two sessions a week are part of the plan.'
  : age >= 35 ? 'From your mid-30s a little regular mobility pays for itself, so one session a week is part of the plan.'
  : null;
