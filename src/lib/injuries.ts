// Which movements load which joints. Shared by the plan builder (long-term
// problem areas from the profile) and the "adjust today" screen.
import type { Slot } from '../types';

export type Area = 'shoulder' | 'lower_back' | 'knee' | 'elbow' | 'wrist';
export const AREAS: [Area, string][] = [['shoulder', 'Shoulder'], ['lower_back', 'Lower back'], ['knee', 'Knee'], ['elbow', 'Elbow'], ['wrist', 'Wrist']];

/** Movements that load each area. */
export const AVOID: Record<Area, Slot[]> = {
  shoulder: ['shoulder_press', 'incline_press', 'chest_press', 'lateral', 'chest_fly', 'pulldown'],
  lower_back: ['hinge', 'squat', 'row'],
  knee: ['squat', 'lunge', 'quad_iso'],
  elbow: ['triceps', 'biceps', 'chest_press', 'shoulder_press'],
  wrist: ['chest_press', 'shoulder_press', 'biceps', 'triceps'],
};
/** Exercises that stay comfortable even though their movement is on the avoid list. */
export const SAFE: Record<Area, string[]> = {
  shoulder: ['face_pull', 'band_pull_apart', 'machine_bench_press', 'wide_grip_lat_pulldown', 'close_grip_front_lat_pulldown'],
  lower_back: ['leg_press', 'seated_cable_rows', 'leverage_iso_row', 'hack_squat', 'lying_leg_curls', 'seated_leg_curl', 'butt_lift_bridge', 'single_leg_glute_bridge', 'goblet_squat', 'one_arm_dumbbell_row'],
  knee: ['leg_press'],
  elbow: ['machine_bench_press', 'butterfly', 'machine_shoulder_military_press'],
  wrist: ['machine_bench_press', 'machine_shoulder_military_press', 'butterfly', 'triceps_pushdown___rope_attachment', 'hammer_curls'],
};
/** Where the freed-up work goes instead. */
export const REDIRECT: Record<Area, Slot[]> = {
  shoulder: ['row', 'rear_delt', 'biceps', 'core'],
  lower_back: ['quad_iso', 'ham_curl', 'glute', 'core', 'calf'],
  knee: ['hinge', 'ham_curl', 'glute', 'calf', 'core'],
  elbow: ['lateral', 'rear_delt', 'core', 'chest_fly'],
  wrist: ['lateral', 'rear_delt', 'core', 'pulldown'],
};

export const areaLabel = (a: Area) => AREAS.find((x) => x[0] === a)![1].toLowerCase();

/** True when an exercise should be kept out for someone with these problem areas. */
export const blockedFor = (areas: Area[] | undefined, ex: { id: string; slot: string }): boolean =>
  !!areas?.some((a) => AVOID[a].includes(ex.slot as Slot) && !SAFE[a].includes(ex.id));
