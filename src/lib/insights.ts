// The link between training and nutrition: reads what was lifted, eaten and
// weighed together, and says what one means for the other.
import { MEAL } from '../data/meals';
import type { DiaryEntry, Macros, PlannedMeal, Profile, Session, WeightEntry } from '../types';
import { windowAvg } from './checkin';
import { addDays, dayKey } from './dates';
import { plannedMacros } from './mealplan';
import { sumMacros } from './nutrition';
import { liftTrends } from './trends';

export { liftTrends };

export interface Insight {
  id: string;
  tone: 'good' | 'warn' | 'info';
  title: string;
  body: string;
}

export interface WeekNutrition {
  daysLogged: number;
  avgKcal: number | null;
  avgProtein: number | null;
  proteinHitDays: number;
}

export function weekNutrition(diary: Record<string, DiaryEntry[]>, t: Macros): WeekNutrition {
  const days = Array.from({ length: 7 }, (_, i) => diary[dayKey(addDays(new Date(), -i))] ?? []).filter((d) => d.length >= 2);
  if (!days.length) return { daysLogged: 0, avgKcal: null, avgProtein: null, proteinHitDays: 0 };
  const sums = days.map(sumMacros);
  const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  return {
    daysLogged: days.length,
    avgKcal: avg(sums.map((x) => x.kcal)),
    avgProtein: avg(sums.map((x) => x.protein)),
    proteinHitDays: sums.filter((x) => x.protein >= t.protein * 0.9).length,
  };
}

const list = (xs: string[]) => (xs.length > 2 ? `${xs.slice(0, 2).join(', ')} and ${xs.length - 2} more` : xs.join(' and '));

export interface InsightInput {
  profile: Profile;
  targets: Macros;
  sessions: Session[];
  diary: Record<string, DiaryEntry[]>;
  weights: WeightEntry[];
  todayMeals: PlannedMeal[];
  nextSessionName?: string;
}

/** Weekly picture: how food, training and weight explain each other. */
export function weeklyInsights(inp: InsightInput): Insight[] {
  const { profile, targets: t, sessions, diary, weights } = inp;
  const out: Insight[] = [];
  const n = weekNutrition(diary, t);
  const lifts = liftTrends(sessions);
  const now = windowAvg(weights, 0), before = windowAvg(weights, 7);
  const dW = now != null && before != null ? now - before : null;
  const stalled = lifts.flat.length + lifts.down.length;
  const lowProtein = n.daysLogged >= 3 && n.avgProtein != null && n.avgProtein < t.protein * 0.85;
  const lowKcal = n.daysLogged >= 3 && n.avgKcal != null && n.avgKcal < t.kcal * 0.85;

  if (lowProtein && stalled > 0) {
    out.push({
      id: 'protein-stall', tone: 'warn', title: 'Protein is holding your lifts back',
      body: `You averaged ${n.avgProtein} g of protein against a ${t.protein} g target, and ${list([...lifts.flat, ...lifts.down])} didn't move. Muscle can't recover without it. Fix the food before blaming the programme: hit ${t.protein} g on at least five days and the weights should start moving again.`,
    });
  } else if (lowProtein) {
    out.push({
      id: 'protein-low', tone: 'warn', title: 'Protein is short',
      body: `You averaged ${n.avgProtein} g against a ${t.protein} g target, hitting it on ${n.proteinHitDays} of ${n.daysLogged} logged days. That is the first thing to fix: it protects muscle${profile.goal === 'lose' ? ' while you lose fat' : ''} and is what your training needs to pay off.`,
    });
  }
  if (lowKcal && lifts.down.length && profile.goal !== 'lose') {
    out.push({
      id: 'underfed', tone: 'warn', title: 'You are under-fuelled for this training',
      body: `Intake averaged ${n.avgKcal} kcal against ${t.kcal}, and ${list(lifts.down)} went backwards. You can't build on a deficit this size. Eat to target for a week before changing anything in the gym.`,
    });
  }
  if (profile.goal === 'lose' && lowKcal && lifts.down.length >= 2) {
    out.push({
      id: 'cut-too-hard', tone: 'warn', title: 'The deficit is too aggressive',
      body: `You're eating ${t.kcal - (n.avgKcal ?? 0)} kcal under an already reduced target and strength is dropping on ${list(lifts.down)}. That is how muscle gets lost. Bring intake back up to ${t.kcal} kcal.`,
    });
  }
  if (dW != null && lifts.up.length >= 2 && !lowProtein) {
    const onTrack = profile.goal === 'lose' ? dW < 0 : profile.goal === 'build' ? dW >= 0 : Math.abs(dW) < 0.6;
    if (onTrack) {
      out.push({
        id: 'working', tone: 'good', title: 'Training and food are pulling together',
        body: `${list(lifts.up)} went up${n.avgProtein ? `, protein averaged ${n.avgProtein} g` : ''}, and your weight is ${dW < -0.05 ? 'coming down' : dW > 0.05 ? 'going up' : 'steady'} as planned. Nothing needs to change. This is what working looks like.`,
      });
    }
  }
  if (profile.goal === 'lose' && dW != null && dW < 0 && lifts.down.length === 0 && lifts.flat.length + lifts.up.length >= 2 && !out.some((x) => x.id === 'working')) {
    out.push({
      id: 'holding-strength', tone: 'good', title: 'You are losing fat, not muscle',
      body: `Weight is down and your lifts are holding or rising. Strength staying put in a deficit is the clearest sign the loss is coming from fat.`,
    });
  }
  if (n.daysLogged < 3 && sessions.length >= 2) {
    out.push({
      id: 'log-food', tone: 'info', title: "I can only see half the picture",
      body: `Your training is logged but food is on ${n.daysLogged} day${n.daysLogged === 1 ? '' : 's'} this week. Log at least three days and I can tell you whether your eating is helping or holding back your lifts.`,
    });
  }
  return out;
}

/** Same-day advice that ties today's eating to today's session. */
export function todayInsights(inp: InsightInput): Insight[] {
  const { targets: t, sessions, diary, todayMeals, nextSessionName } = inp;
  const out: Insight[] = [];
  const eaten = sumMacros(diary[dayKey()] ?? []);
  const hour = new Date().getHours();
  const trainedToday = sessions.find((sn) => dayKey(new Date(sn.date)) === dayKey());
  const proteinLeft = Math.round(t.protein - eaten.protein);

  if (trainedToday && proteinLeft > 25) {
    const dinner = todayMeals.find((m) => m.slot === 'dinner');
    const cover = dinner ? Math.round(plannedMacros(dinner).protein) : 0;
    out.push({
      id: 'post-session', tone: 'info', title: `${proteinLeft} g of protein still to eat`,
      body: `You trained ${trainedToday.dayName} today, so tonight's food is what turns it into progress.${dinner ? ` ${MEAL[dinner.mealId].name} covers ${cover} g${proteinLeft - cover > 15 ? `, so add a shake or yoghurt for the other ${proteinLeft - cover} g` : ''}.` : ''}`,
    });
  } else if (!trainedToday && nextSessionName && hour >= 11 && eaten.kcal < t.kcal * 0.25) {
    out.push({
      id: 'pre-session', tone: 'warn', title: 'Eat before you train',
      body: `You've had ${eaten.kcal} kcal so far and ${nextSessionName} is up next. Lifting on empty costs you reps. Get a meal with carbs and protein in one to two hours before the session.`,
    });
  } else if (!trainedToday && hour >= 19 && proteinLeft > 40) {
    out.push({
      id: 'protein-evening', tone: 'info', title: `${proteinLeft} g of protein short today`,
      body: 'An easy close: Greek yoghurt, a shake, or cottage cheese before bed.',
    });
  }
  return out;
}
