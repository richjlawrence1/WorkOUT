import { EXERCISES } from '../data/exercises';
import type { Exercise, Level, Plan, PlanDay, PlanExercise, Profile, Slot } from '../types';

export const EX: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

export const EQUIPMENT: { group: string; items: [string, string][] }[] = [
  {
    group: 'Free weights',
    items: [
      ['dumbbells', 'Dumbbells'],
      ['barbell', 'Barbell & plates'],
      ['rack', 'Squat rack'],
      ['bench', 'Bench'],
      ['kettlebell', 'Kettlebell'],
      ['ezbar', 'EZ curl bar'],
    ],
  },
  {
    group: 'Bodyweight & bands',
    items: [
      ['pullup', 'Pull-up bar'],
      ['dipbars', 'Dip bars'],
      ['bands', 'Resistance bands'],
    ],
  },
  {
    group: 'Cables & machines',
    items: [
      ['cables', 'Cable machine'],
      ['latpulldown', 'Lat pulldown'],
      ['smith', 'Smith machine'],
      ['legpress', 'Leg press'],
      ['hacksquat', 'Hack squat'],
      ['legext', 'Leg extension'],
      ['legcurl', 'Leg curl'],
      ['chestmachine', 'Chest press / pec deck'],
      ['shouldermachine', 'Shoulder press machine'],
      ['rowmachine', 'Row machine'],
      ['calfmachine', 'Calf raise machine'],
      ['backext', 'Back extension bench'],
    ],
  },
];
export const ALL_EQUIPMENT = EQUIPMENT.flatMap((g) => g.items.map((i) => i[0]));
export const EQUIPMENT_PRESETS: Record<string, string[]> = {
  'Full gym': ALL_EQUIPMENT,
  'Home gym': ['dumbbells', 'barbell', 'rack', 'bench', 'pullup', 'bands'],
  'Dumbbells only': ['dumbbells', 'bench'],
  'Bodyweight': [],
};

const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced'];

export const available = (profile: Pick<Profile, 'equipment' | 'experience'>, slot?: string): Exercise[] =>
  EXERCISES.filter(
    (e) =>
      (!slot || e.slot === slot) &&
      e.equipment.every((q) => profile.equipment.includes(q)) &&
      LEVELS.indexOf(e.level as Level) <= LEVELS.indexOf(profile.experience)
  );

type Template = { name: string; focus: string; slots: Slot[] };

// Slots are listed in priority order: when a session is short, the tail is dropped.
const T: Record<string, Template> = {
  fullA: { name: 'Full Body A', focus: 'Squat · Press · Row', slots: ['squat', 'chest_press', 'row', 'shoulder_press', 'hinge', 'core', 'biceps', 'triceps'] },
  fullB: { name: 'Full Body B', focus: 'Hinge · Incline · Pull', slots: ['hinge', 'incline_press', 'pulldown', 'lunge', 'lateral', 'triceps', 'biceps', 'core'] },
  fullC: { name: 'Full Body C', focus: 'Legs · Chest · Back', slots: ['squat', 'chest_press', 'pulldown', 'ham_curl', 'shoulder_press', 'row', 'core', 'calf'] },
  upperA: { name: 'Upper Body A', focus: 'Chest · Back · Arms', slots: ['chest_press', 'row', 'shoulder_press', 'pulldown', 'triceps', 'biceps', 'lateral', 'rear_delt'] },
  upperB: { name: 'Upper Body B', focus: 'Back · Shoulders · Arms', slots: ['pulldown', 'incline_press', 'row', 'lateral', 'biceps', 'triceps', 'chest_fly', 'rear_delt'] },
  lowerA: { name: 'Lower Body A', focus: 'Quads · Glutes', slots: ['squat', 'hinge', 'lunge', 'quad_iso', 'calf', 'core', 'ham_curl', 'glute'] },
  lowerB: { name: 'Lower Body B', focus: 'Hamstrings · Glutes', slots: ['hinge', 'squat', 'glute', 'ham_curl', 'core', 'calf', 'lunge', 'quad_iso'] },
  push: { name: 'Push', focus: 'Chest · Shoulders · Triceps', slots: ['chest_press', 'shoulder_press', 'incline_press', 'lateral', 'triceps', 'chest_fly', 'triceps', 'core'] },
  pull: { name: 'Pull', focus: 'Back · Biceps', slots: ['pulldown', 'row', 'rear_delt', 'biceps', 'row', 'biceps', 'core', 'pulldown'] },
  legs: { name: 'Legs', focus: 'Quads · Hamstrings · Glutes', slots: ['squat', 'hinge', 'lunge', 'ham_curl', 'quad_iso', 'calf', 'glute', 'core'] },
};

const SPLITS: Record<number, { name: string; days: string[] }> = {
  2: { name: 'Full Body', days: ['fullA', 'fullB'] },
  3: { name: 'Full Body', days: ['fullA', 'fullB', 'fullC'] },
  4: { name: 'Upper / Lower', days: ['upperA', 'lowerA', 'upperB', 'lowerB'] },
  5: { name: 'Push / Pull / Legs + Upper / Lower', days: ['push', 'pull', 'legs', 'upperB', 'lowerB'] },
  6: { name: 'Push / Pull / Legs', days: ['push', 'pull', 'legs', 'push', 'pull', 'legs'] },
};

// When a slot has nothing available for the user's kit, try these instead.
const FALLBACK: Partial<Record<Slot, Slot[]>> = {
  incline_press: ['chest_press', 'chest_fly'],
  chest_fly: ['chest_press', 'incline_press'],
  shoulder_press: ['incline_press', 'chest_press'],
  lateral: ['rear_delt', 'shoulder_press'],
  rear_delt: ['row', 'lateral'],
  pulldown: ['row'],
  row: ['pulldown'],
  quad_iso: ['lunge', 'squat'],
  ham_curl: ['glute', 'hinge'],
  hinge: ['glute'],
  glute: ['lunge', 'hinge'],
  calf: ['core'],
  biceps: ['row', 'pulldown'],
  triceps: ['chest_press'],
  lunge: ['squat'],
};

export const prescription = (ex: Exercise, profile: Pick<Profile, 'goal' | 'experience'>) => {
  const sets = profile.experience === 'beginner' ? 3 : ex.compound ? 4 : 3;
  if (ex.timed) return { sets: 3, repMin: 30, repMax: 60 };
  if (ex.bodyweight) return { sets, repMin: 8, repMax: 15 };
  if (ex.slot === 'core' || ex.slot === 'calf') return { sets: 3, repMin: 10, repMax: 15 };
  if (!ex.compound) return { sets, repMin: 10, repMax: 15 };
  switch (profile.goal) {
    case 'strength': return { sets, repMin: 4, repMax: 6 };
    case 'lose': return { sets, repMin: 8, repMax: 12 };
    default: return { sets, repMin: 6, repMax: 10 };
  }
};

const countFor = (mins: number) => (mins <= 30 ? 4 : mins <= 45 ? 5 : mins <= 60 ? 6 : mins <= 75 ? 7 : 8);

export function generatePlan(profile: Profile, seed = 0): Plan {
  const split = SPLITS[Math.min(6, Math.max(2, profile.daysPerWeek))];
  const usedInWeek: Record<string, number> = {};
  const n = countFor(profile.sessionMins);

  const days: PlanDay[] = split.days.map((key, di) => {
    const t = T[key];
    const usedToday = new Set<string>();
    const exercises: PlanExercise[] = [];
    for (const slot of t.slots) {
      if (exercises.length >= n) break;
      const pick = [slot, ...(FALLBACK[slot] ?? [])]
        .map((sl) => {
          const pool = available(profile, sl).filter((e) => !usedToday.has(e.id));
          if (!pool.length) return undefined;
          // Prefer exercises not yet used this week so repeat days get variety;
          // `seed` rotates the choice when the user asks for a fresh plan.
          const fresh = pool.filter((e) => !usedInWeek[e.id]);
          const list = fresh.length ? fresh : pool;
          return list[seed % Math.min(list.length, 3)];
        })
        .find(Boolean);
      if (!pick) continue;
      usedToday.add(pick.id);
      usedInWeek[pick.id] = (usedInWeek[pick.id] ?? 0) + 1;
      exercises.push({ exId: pick.id, slot: pick.slot as Slot, ...prescription(pick, profile) });
    }
    const repeat = split.days.indexOf(key) !== di;
    return { id: `d${di}`, name: repeat ? `${t.name} II` : t.name, focus: t.focus, exercises };
  });

  return { createdAt: new Date().toISOString(), split: split.name, days };
}

/** Alternatives for the same movement the user can swap to. */
export const alternatives = (profile: Profile, exId: string, exclude: string[]): Exercise[] => {
  const ex = EX[exId];
  if (!ex) return [];
  const same = available(profile, ex.slot);
  const other = (FALLBACK[ex.slot as Slot] ?? []).flatMap((sl) => available(profile, sl));
  return [...same, ...other].filter((e) => e.id !== exId && !exclude.includes(e.id));
};

export const estMinutes = (day: PlanDay): number =>
  Math.round(day.exercises.reduce((m, e) => m + e.sets * (EX[e.exId]?.compound ? 2.8 : 2), 5) / 5) * 5;

export const muscleLabel = (m: string) => m.charAt(0).toUpperCase() + m.slice(1);
