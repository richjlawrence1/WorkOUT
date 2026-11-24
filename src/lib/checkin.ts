import type { CheckIn, DiaryEntry, Profile, Session, WeightEntry } from '../types';
import { addDays, dayKey, fromKey } from './dates';
import { targetRate } from './nutrition';

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Average of weigh-ins in the `days`-long window ending `endOffset` days ago. */
export const windowAvg = (weights: WeightEntry[], endOffset: number, days = 7): number | null => {
  const end = addDays(new Date(), -endOffset);
  const start = addDays(end, -days);
  return avg(weights.filter((w) => fromKey(w.date) > start && fromKey(w.date) <= end).map((w) => w.kg));
};

export const latestWeight = (weights: WeightEntry[], fallback: number): number =>
  weights.length ? weights[weights.length - 1].kg : fallback;

export interface CheckInAnswers {
  energy: number;
  sleep: number;
  hunger: number;
  adherence: number;
  notes: string;
}

export function buildCheckIn(
  profile: Profile,
  weights: WeightEntry[],
  sessions: Session[],
  diary: Record<string, DiaryEntry[]>,
  a: CheckInAnswers
): CheckIn {
  const since = addDays(new Date(), -7);
  const workoutsDone = sessions.filter((sn) => new Date(sn.date) > since).length;
  const loggedDays = Array.from({ length: 7 }, (_, i) => diary[dayKey(addDays(new Date(), -i))] ?? []).filter((d) => d.length);
  const avgKcal = loggedDays.length >= 3 ? Math.round(avg(loggedDays.map((d) => d.reduce((s, e) => s + e.kcal, 0))) as number) : null;

  const now = windowAvg(weights, 0);
  const before = windowAvg(weights, 7);
  const weightChange = now != null && before != null ? Math.round((now - before) * 10) / 10 : null;

  const actions: string[] = [];
  let kcalDelta = 0;
  let verdict = 'Week logged. A few more weigh-ins and I can read your trend.';

  if (weightChange != null && now != null) {
    const rate = weightChange / now;
    const [lo, hi] = targetRate(profile.goal);
    const dir = weightChange > 0 ? 'up' : 'down';
    if (rate < lo) {
      // Dropping faster (or gaining slower) than the healthy band.
      kcalDelta = 150;
      verdict = profile.goal === 'lose'
        ? `Weight is ${dir} ${Math.abs(weightChange)} kg, faster than planned. Adding food to protect muscle and energy.`
        : `Weight is ${dir} ${Math.abs(weightChange)} kg. You need more fuel to grow.`;
    } else if (rate > hi) {
      kcalDelta = -150;
      verdict = profile.goal === 'lose'
        ? `Weight is ${weightChange === 0 ? 'flat' : `${dir} ${Math.abs(weightChange)} kg`}. Trimming calories slightly to get things moving.`
        : `Weight is ${dir} ${Math.abs(weightChange)} kg, quicker than ideal. Easing calories back to keep gains lean.`;
    } else {
      verdict = `Weight is ${weightChange === 0 ? 'holding' : `${dir} ${Math.abs(weightChange)} kg`}. Right on pace.`;
    }
    // Poor adherence means the numbers aren't telling us about the targets.
    if (a.adherence <= 2 && kcalDelta < 0) {
      kcalDelta = 0;
      actions.push('Targets stay the same this week. Focus on hitting them most days before we change anything.');
    }
  } else {
    actions.push('Weigh in at least twice a week so I can read your trend and tune your calories.');
  }
  if (kcalDelta) actions.push(`Daily calories ${kcalDelta > 0 ? 'up' : 'down'} ${Math.abs(kcalDelta)} kcal from today.`);

  if (workoutsDone >= profile.daysPerWeek) actions.push(`All ${profile.daysPerWeek} sessions done. Loads go up wherever you hit the top of your rep range.`);
  else if (workoutsDone === 0) actions.push('No sessions logged. Book the first one in your diary today, even a short one.');
  else actions.push(`${workoutsDone} of ${profile.daysPerWeek} sessions done. Next week, lock in the days in advance.`);

  if (a.sleep <= 2) actions.push('Sleep was poor. Aim for a fixed bedtime and no caffeine after 2pm; recovery drives progress.');
  if (a.energy <= 2 && profile.goal === 'lose' && kcalDelta <= 0) actions.push('Energy is low. Put more of your carbs around training.');
  if (a.hunger >= 4) actions.push('Hunger is high. Lean on protein and high-volume foods: potatoes, veg, fruit, yoghurt.');
  if (avgKcal == null) actions.push('Log your food on at least three days so I can compare intake against your target.');

  return {
    date: new Date().toISOString(),
    weightKg: now != null ? Math.round(now * 10) / 10 : null,
    weightChange,
    workoutsDone,
    workoutsPlanned: profile.daysPerWeek,
    avgKcal,
    ...a,
    kcalDelta,
    verdict,
    actions,
  };
}

/** A check-in is due if none has been recorded in the last 6 days. */
export const checkInDue = (checkins: CheckIn[], onboardedAt: string | null): boolean => {
  const last = checkins.length ? checkins[checkins.length - 1].date : onboardedAt;
  if (!last) return false;
  return Date.now() - new Date(last).getTime() > 6 * 864e5;
};

export const weighInDue = (weights: WeightEntry[], weighInDay: number): boolean => {
  const today = new Date();
  if (weights.some((w) => w.date === dayKey(today))) return false;
  const last = weights.length ? fromKey(weights[weights.length - 1].date) : null;
  return today.getDay() === weighInDay || !last || today.getTime() - last.getTime() > 7 * 864e5;
};
