import type { Macros, Profile } from '../types';

const ACTIVITY = { desk: 1.3, light: 1.45, active: 1.6, very: 1.75 };

/** Mifflin-St Jeor resting energy, scaled for lifestyle and training days. */
export function tdee(p: Profile, weightKg: number): number {
  const bmr = 10 * weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
  return bmr * (ACTIVITY[p.activity] + p.daysPerWeek * 0.02);
}

export function targets(p: Profile, weightKg: number, kcalAdjust = 0): Macros {
  const maintenance = tdee(p, weightKg);
  const factor = p.goal === 'lose' ? 0.8 : p.goal === 'build' ? 1.1 : p.goal === 'strength' ? 1.05 : 0.95;
  const floor = p.sex === 'male' ? 1500 : 1200;
  const kcal = Math.max(floor, Math.round((maintenance * factor + kcalAdjust) / 10) * 10);
  const protein = Math.round(weightKg * (p.goal === 'lose' || p.goal === 'recomp' ? 2.2 : 1.8));
  const fat = Math.max(Math.round(weightKg * 0.8), Math.round((kcal * 0.22) / 9));
  const carbs = Math.max(50, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat };
}

/** Healthy weekly rate of change as a fraction of body weight. */
export const targetRate = (goal: Profile['goal']): [number, number] =>
  goal === 'lose' ? [-0.01, -0.004] : goal === 'build' ? [0.001, 0.005] : goal === 'strength' ? [0, 0.004] : [-0.004, 0.002];

export const sumMacros = (items: Macros[]): Macros =>
  items.reduce(
    (a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

export const scale = <T extends Macros>(m: T, k: number): T => ({
  ...m,
  kcal: Math.round(m.kcal * k),
  protein: Math.round(m.protein * k * 10) / 10,
  carbs: Math.round(m.carbs * k * 10) / 10,
  fat: Math.round(m.fat * k * 10) / 10,
});
