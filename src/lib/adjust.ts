// Rebuilds today's session around a sore area, limited time or low energy.
import type { PlanDay, Profile, Session, SessionEntry, Slot } from '../types';
import { EX, available } from './plan';
import { buildEntries } from './progression';

export type Area = 'shoulder' | 'lower_back' | 'knee' | 'elbow' | 'wrist';
export const AREAS: [Area, string][] = [['shoulder', 'Shoulder'], ['lower_back', 'Lower back'], ['knee', 'Knee'], ['elbow', 'Elbow'], ['wrist', 'Wrist']];

/** Movements that load each area. Anything here is swapped out or dropped. */
const AVOID: Record<Area, Slot[]> = {
  shoulder: ['shoulder_press', 'incline_press', 'chest_press', 'lateral', 'chest_fly', 'pulldown'],
  lower_back: ['hinge', 'squat', 'row'],
  knee: ['squat', 'lunge', 'quad_iso'],
  elbow: ['triceps', 'biceps', 'chest_press', 'shoulder_press'],
  wrist: ['chest_press', 'shoulder_press', 'biceps', 'triceps'],
};
/** Exercises that stay comfortable for an area even though their slot is on its avoid list. */
const SAFE: Record<Area, string[]> = {
  shoulder: ['face_pull', 'band_pull_apart'],
  lower_back: ['leg_press', 'seated_cable_rows', 'leverage_iso_row', 'hack_squat', 'lying_leg_curls', 'seated_leg_curl', 'butt_lift_bridge', 'single_leg_glute_bridge'],
  knee: [],
  elbow: ['machine_bench_press', 'butterfly'],
  wrist: ['machine_bench_press', 'machine_shoulder_military_press', 'butterfly', 'triceps_pushdown_-_rope_attachment'.replace(/[^a-z0-9]/g, '_')],
};
/** Where the freed-up work goes instead. */
const REDIRECT: Record<Area, Slot[]> = {
  shoulder: ['row', 'rear_delt', 'biceps', 'core'],
  lower_back: ['quad_iso', 'ham_curl', 'glute', 'core', 'calf'],
  knee: ['hinge', 'ham_curl', 'glute', 'calf', 'core'],
  elbow: ['lateral', 'rear_delt', 'core', 'chest_fly'],
  wrist: ['lateral', 'rear_delt', 'core', 'pulldown'],
};

export interface Adjustment {
  areas: Area[];
  minutes: number | null; // null = full session
  lowEnergy: boolean;
}

export interface Adjusted {
  entries: SessionEntry[];
  changes: string[];
}

const label = (a: Area) => AREAS.find((x) => x[0] === a)![1].toLowerCase();

export function adjustSession(day: PlanDay, sessions: Session[], profile: Profile, adj: Adjustment): Adjusted {
  const changes: string[] = [];
  let exercises = day.exercises.map((e) => ({ ...e }));

  for (const area of adj.areas) {
    const used = new Set(exercises.map((e) => e.exId));
    exercises = exercises.flatMap((pe) => {
      if (!AVOID[area].includes(pe.slot) || SAFE[area].includes(pe.exId)) return [pe];
      const name = EX[pe.exId].name;
      // First choice: a friendlier version of the same movement; otherwise move the work elsewhere.
      const same = available(profile, pe.slot).find((e) => SAFE[area].includes(e.id) && !used.has(e.id));
      const alt = same ?? REDIRECT[area].flatMap((sl) => available(profile, sl)).find((e) => !used.has(e.id) && !adj.areas.some((a) => AVOID[a].includes(e.slot as Slot) && !SAFE[a].includes(e.id)));
      if (!alt) {
        changes.push(`${name} is out to protect your ${label(area)}.`);
        return [];
      }
      used.add(alt.id);
      changes.push(`${name} swapped for ${alt.name} to keep load off your ${label(area)}.`);
      return [{ ...pe, exId: alt.id, slot: alt.slot as Slot, sets: Math.min(pe.sets, 3), repMin: alt.compound ? 8 : 10, repMax: alt.compound ? 12 : 15 }];
    });
  }

  if (adj.minutes) {
    const keep = adj.minutes <= 20 ? 3 : adj.minutes <= 30 ? 4 : 5;
    if (exercises.length > keep) {
      const dropped = exercises.slice(keep).map((e) => EX[e.exId].name);
      exercises = exercises.slice(0, keep);
      changes.push(`Short on time, so the session is your ${keep} highest-value lifts. Dropped: ${dropped.join(', ')}.`);
    }
    if (adj.minutes <= 20) {
      exercises = exercises.map((e) => ({ ...e, sets: Math.min(e.sets, 2) }));
      changes.push('Two hard sets each. Keep rests to a minute.');
    } else if (adj.minutes <= 30) {
      exercises = exercises.map((e) => ({ ...e, sets: Math.min(e.sets, 3) }));
    }
  }

  let entries = buildEntries({ ...day, exercises }, sessions, profile.goal);

  if (adj.lowEnergy) {
    entries = entries.map((e) => ({
      ...e,
      sets: e.sets.slice(0, Math.max(2, e.sets.length - 1)).map((st) => ({ ...st, kg: st.kg ? Math.max(2.5, Math.round((st.kg * 0.9) / 2.5) * 2.5) : st.kg })),
      easy: true,
      note: 'Easy day: lighter, one set fewer.',
      why: "You said you're run down, so today is about keeping the habit, not chasing numbers. Weights are 10% down and each lift loses a set. Leave two or three reps in the tank. Today doesn't count against your progression.",
    }));
    changes.push('Low energy, so every lift is 10% lighter with one set fewer. Stop each set well short of failure.');
  }

  if (adj.areas.length) {
    const why = `Adjusted around your ${adj.areas.map(label).join(' and ')}. If anything here causes sharp pain, stop the exercise.`;
    entries = entries.map((e, i) => (i === 0 ? { ...e, why: `${why} ${e.why ?? ''}`.trim() } : e));
  }
  return { entries, changes };
}
