import { EX } from './plan';

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
export const BAR_KG = 20;

export const usesBarbell = (exId: string): boolean => {
  const ex = EX[exId];
  return !!ex && ex.equipment.includes('barbell') && !ex.bodyweight;
};

/** Plates for one side of a 20 kg bar, heaviest first. Null when the weight can't be made. */
export function platesPerSide(totalKg: number, bar = BAR_KG): number[] | null {
  let side = (totalKg - bar) / 2;
  if (side < 0) return null;
  const out: number[] = [];
  for (const p of PLATES) {
    while (side >= p - 1e-9) {
      out.push(p);
      side -= p;
    }
  }
  return side > 0.01 ? null : out;
}

export const plateLine = (totalKg: number): string | null => {
  const p = platesPerSide(totalKg);
  if (!p) return null;
  return p.length ? `${p.join(' + ')} per side on a ${BAR_KG} kg bar` : `Empty ${BAR_KG} kg bar`;
};

const round = (kg: number, step = 2.5) => Math.max(step, Math.round(kg / step) * step);

/** Ramp-up sets before the first working set of a heavy compound lift. */
export function warmupSets(exId: string, workKg: number | null): { kg: number; reps: number }[] {
  const ex = EX[exId];
  if (!ex || !workKg || !ex.compound || ex.bodyweight) return [];
  const floor = usesBarbell(exId) ? BAR_KG : 0;
  if (workKg < Math.max(30, floor * 1.5)) return [];
  const steps: [number, number][] = [[0.4, 8], [0.6, 5], [0.8, 3]];
  const seen = new Set<number>();
  return steps
    .map(([pct, reps]) => ({ kg: Math.max(floor, round(workKg * pct)), reps }))
    .filter((w) => w.kg < workKg && !seen.has(w.kg) && !!seen.add(w.kg));
}
