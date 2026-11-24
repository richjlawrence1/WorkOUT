// Open Food Facts (https://openfoodfacts.org): free, open product database
// with strong UK supermarket coverage, including Aldi own-brand lines.
import { Platform } from 'react-native';
import { APP_NAME } from '../theme';
import type { Food } from '../types';

const BASE = 'https://uk.openfoodfacts.org';
const FIELDS = 'code,product_name,brands,serving_size,serving_quantity,nutriments';
// Browsers forbid setting User-Agent; native builds identify the app as OFF asks.
const headers: Record<string, string> = Platform.OS === 'web' ? {} : { 'User-Agent': `${APP_NAME}/1.0 (mobile app)` };

const num = (v: unknown): number => (typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) || 0 : 0);

function toFood(p: any): Food | null {
  const n = p?.nutriments;
  const name = (p?.product_name ?? '').trim();
  if (!n || !name) return null;
  const kcal100 = num(n['energy-kcal_100g']) || num(n['energy_100g']) / 4.184;
  if (!kcal100) return null;
  const grams = num(p.serving_quantity);
  // Prefer the pack's stated serving; fall back to 100 g.
  const k = grams > 0 ? grams / 100 : 1;
  const r = (x: number) => Math.round(x * k * 10) / 10;
  return {
    id: 'off-' + p.code,
    barcode: String(p.code),
    name,
    brand: (p.brands ?? '').split(',')[0]?.trim() || undefined,
    serving: grams > 0 ? (p.serving_size || `${grams} g`) : '100 g',
    kcal: Math.round(kcal100 * k),
    protein: r(num(n.proteins_100g)),
    carbs: r(num(n.carbohydrates_100g)),
    fat: r(num(n.fat_100g)),
  };
}

async function getJson(url: string): Promise<any> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  try {
    const res = await fetch(url, { headers, signal: ctl.signal });
    if (!res.ok) throw new Error(`Food database responded ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Returns null when the barcode is not in the database. Throws on network failure. */
export async function lookupBarcode(code: string): Promise<Food | null> {
  const json = await getJson(`${BASE}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`);
  return json?.status === 1 ? toFood(json.product) : null;
}

export async function searchProducts(query: string): Promise<Food[]> {
  const json = await getJson(
    `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=25&fields=${FIELDS}`
  );
  return ((json?.products ?? []) as any[]).map(toFood).filter((x): x is Food => !!x);
}
