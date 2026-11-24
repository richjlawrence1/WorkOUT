import { MEAL, MEALS } from '../data/meals';
import type { FoodPrefs, Macros, Meal, MealPlan, MealSlot, PlannedMeal } from '../types';
import { dayKey, weekStart } from './dates';
import { scale, sumMacros } from './nutrition';

const DIET_BLOCK: Record<FoodPrefs['diet'], string[]> = {
  any: [],
  pescatarian: ['meat'],
  vegetarian: ['meat', 'seafood'],
  vegan: ['animal'],
};

export const allowedMeals = (prefs: FoodPrefs, slot?: MealSlot): Meal[] => {
  const blocked = [...DIET_BLOCK[prefs.diet], ...prefs.dislikes];
  return MEALS.filter((x) => (!slot || x.slot === slot) && !x.tags.some((t) => blocked.includes(t)));
};

export const plannedMacros = (pm: PlannedMeal): Macros => scale(MEAL[pm.mealId], pm.servings);
export const dayMacros = (day: PlannedMeal[]): Macros => sumMacros(day.map(plannedMacros));

/** Small deterministic PRNG so a plan is stable until the user regenerates it. */
const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

/**
 * Chooses a meal for a slot. Favourites are heavily weighted so they repeat
 * through the week; non-favourites avoid appearing two days in a row.
 */
function choose(pool: Meal[], favs: string[], recent: string[], rand: () => number, proteinBias: number): Meal | undefined {
  if (!pool.length) return undefined;
  const weights = pool.map((x) => {
    let w = 1 + (x.protein / x.kcal) * 10 * proteinBias;
    if (favs.includes(x.id)) w *= 6;
    else if (recent.includes(x.id)) w *= 0.15;
    return w;
  });
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** Scale portions in quarter steps so the day lands on the calorie target. */
function fitDay(day: PlannedMeal[], target: Macros): PlannedMeal[] {
  const base = sumMacros(day.map((d) => MEAL[d.mealId])).kcal;
  if (!base) return day;
  const k = Math.min(1.75, Math.max(0.5, target.kcal / base));
  const out = day.map((d) => ({ ...d, servings: d.slot === 'snack' ? 1 : Math.round(k * 4) / 4 }));
  // Nudge the largest meal if rounding left us more than ~6% out.
  for (let i = 0; i < 4; i++) {
    const diff = target.kcal - dayMacros(out).kcal;
    if (Math.abs(diff) < target.kcal * 0.06) break;
    const main = out.filter((d) => d.slot !== 'snack').sort((a, b) => MEAL[b.mealId].kcal - MEAL[a.mealId].kcal)[i % 3];
    if (!main) break;
    main.servings = Math.min(2, Math.max(0.5, main.servings + (diff > 0 ? 0.25 : -0.25)));
  }
  return out;
}

export function generateMealPlan(prefs: FoodPrefs, favs: string[], target: Macros, seed = Date.now()): MealPlan {
  const rand = rng(seed % 4294967296);
  const slots: MealSlot[] = ['breakfast', 'lunch', 'dinner', ...Array<MealSlot>(prefs.snacks).fill('snack')];
  const days: PlannedMeal[][] = [];
  for (let d = 0; d < 7; d++) {
    const prev = days[d - 1]?.map((x) => x.mealId) ?? [];
    const today: PlannedMeal[] = [];
    for (const slot of slots) {
      const pool = allowedMeals(prefs, slot).filter((x) => !today.some((t) => t.mealId === x.id));
      const pick = choose(pool, favs, prev, rand, 1.5);
      if (pick) today.push({ mealId: pick.id, slot, servings: 1 });
    }
    days.push(fitDay(today, target));
  }
  return { weekStart: dayKey(weekStart()), days };
}

export function swapMeal(plan: MealPlan, dayIdx: number, idx: number, prefs: FoodPrefs, target: Macros, toId?: string): MealPlan {
  const day = plan.days[dayIdx];
  const cur = day[idx];
  const pool = allowedMeals(prefs, cur.slot).filter((x) => !day.some((t) => t.mealId === x.id));
  const next = toId ? MEAL[toId] : pool[Math.floor(Math.random() * pool.length)];
  if (!next) return plan;
  const newDay = day.map((x, i) => (i === idx ? { ...x, mealId: next.id, servings: 1 } : { ...x }));
  const days = plan.days.map((x, i) => (i === dayIdx ? fitDay(newDay, target) : x));
  return { ...plan, days };
}

/** Aggregated ingredient list for the week, grouped by item. */
export function shoppingList(plan: MealPlan): { item: string; uses: number; qty: string[] }[] {
  const map = new Map<string, { item: string; uses: number; qty: string[] }>();
  for (const day of plan.days)
    for (const pm of day)
      for (const [item, qty] of MEAL[pm.mealId].ingredients) {
        const row = map.get(item) ?? { item, uses: 0, qty: [] };
        row.uses += 1;
        if (!row.qty.includes(qty)) row.qty.push(qty);
        map.set(item, row);
      }
  return [...map.values()].sort((a, b) => a.item.localeCompare(b.item));
}

export const todayIndex = () => (new Date().getDay() + 6) % 7;
