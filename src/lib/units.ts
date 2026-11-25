export type Units = 'kg' | 'lb' | 'st';
const LB = 2.2046226;

export const UNIT_OPTIONS: [Units, string][] = [['kg', 'Kilograms'], ['st', 'Stones & pounds'], ['lb', 'Pounds']];

/** Body weight split into a value and a unit so it can sit in a stat tile. */
export function bodyParts(kg: number, units: Units = 'kg'): { value: string; unit: string } {
  if (units === 'kg') return { value: kg.toFixed(1), unit: 'kg' };
  const lb = kg * LB;
  if (units === 'lb') return { value: lb.toFixed(1), unit: 'lb' };
  let st = Math.floor(lb / 14);
  let rem = Math.round(lb - st * 14);
  if (rem === 14) { st += 1; rem = 0; }
  return { value: `${st} st ${rem}`, unit: 'lb' };
}

export const fmtBody = (kg: number, units: Units = 'kg'): string => {
  const p = bodyParts(kg, units);
  return `${p.value} ${p.unit}`;
};

/** A change in body weight. Stones users see pounds, since changes are small. */
export function deltaParts(kg: number, units: Units = 'kg'): { value: string; unit: string } {
  const v = units === 'kg' ? kg : kg * LB;
  return { value: `${v > 0 ? '+' : ''}${v.toFixed(1)}`, unit: units === 'kg' ? 'kg' : 'lb' };
}
export const fmtAmount = (kg: number, units: Units = 'kg'): string =>
  units === 'kg' ? `${Math.abs(kg).toFixed(1)} kg` : `${Math.abs(kg * LB).toFixed(1)} lb`;

export const toKg = (value: number, units: Units, extraLb = 0): number =>
  units === 'kg' ? value : units === 'lb' ? value / LB : (value * 14 + extraLb) / LB;
