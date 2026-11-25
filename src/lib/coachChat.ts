// Conversational coach. Talks to Claude with the user's own API key, kept in
// the device keychain. Suitable for personal use; a public release must move
// this call behind a server so no key ships in the app.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { MEAL } from '../data/meals';
import { selectTargets, selectWeight, sessionsThisWeek, useStore } from '../store';
import { weekNutrition, weeklyInsights } from './insights';
import { todayIndex } from './mealplan';
import { sumMacros } from './nutrition';
import { EX } from './plan';
import { nextTarget } from './progression';
import { dayKey } from './dates';

const KEY = 'anthropic-api-key';
const web = Platform.OS === 'web';

export const getApiKey = async (): Promise<string | null> => (web ? AsyncStorage.getItem(KEY) : SecureStore.getItemAsync(KEY));
export const setApiKey = async (key: string): Promise<void> => {
  const v = key.trim();
  if (web) return v ? AsyncStorage.setItem(KEY, v) : AsyncStorage.removeItem(KEY);
  return v ? SecureStore.setItemAsync(KEY, v) : SecureStore.deleteItemAsync(KEY);
};

const INSTRUCTIONS = `You are the personal coach inside a training and nutrition app. You are talking with the one person whose data appears below, in the app's chat screen on their phone.

How to answer:
- Ground every answer in their data. Quote their actual numbers (weights lifted, reps, calories, protein, body weight) rather than giving general advice.
- Your distinctive job is connecting training and nutrition: when lifts stall, look at protein, calories and sleep before blaming the programme; when weight stalls, look at intake and adherence.
- Be direct and brief, the way a good trainer talks between sets: usually two to five sentences, plain text without markdown headings or tables. Give a clear recommendation, then the reason.
- The app sets weights, sets and calories from its own rules (described below). Explain those decisions accurately. You cannot change the plan yourself, so when a change is needed tell them exactly where to do it: swap an exercise or adjust today's session on the Train tab, swap a meal on the Nutrition tab, or change goal, schedule and equipment in Settings.
- If the data needed to answer is missing (for example no food logged), say so and tell them what to log.
- For pain, injury or medical questions, give sensible training adjustments and say when it needs a physio or GP. Never recommend eating below their calorie floor or rapid weight loss.

How the app's rules work:
- Progression: when every set of a lift reaches the top of its rep range, the weight goes up next session and reps restart at the bottom. Otherwise the weight holds and the target is one more rep. Three sessions stuck at one weight adds a set. Two sessions below the rep range drops the weight 10% and removes a set.
- Weekly check-in: compares the 7-day average weight with the week before and moves one lever at a time. For fat loss that is too slow the order is: follow the plan first, then hit the step target, then do the prescribed cardio, then cardio goes up 5-10 minutes per session (to a 45 minute ceiling), then steps go up, and only then calories drop by 150. Losing too fast removes cardio or adds 150 calories. For muscle gain, calories move by 150.
- Training blocks: if no main lift improves in a week the big lifts move to two fewer reps (heavier) for three weeks; poor sleep and energy together trigger a recovery week with one set fewer.`;

/** A compact snapshot of everything the coach should know, rebuilt for each conversation. */
export function buildContext(): string {
  const st = useStore.getState();
  const p = st.profile;
  if (!p) return 'No profile yet.';
  const t = selectTargets(st)!;
  const lines: string[] = [];
  const today = st.diary[dayKey()] ?? [];
  const eaten = sumMacros(today);
  const wk = weekNutrition(st.diary, t);

  lines.push(`Today: ${new Date().toDateString()}`);
  lines.push(`Profile: ${p.name || 'User'}, ${p.sex}, ${p.age}y, ${p.heightCm} cm. Goal: ${p.goal}. Experience: ${p.experience}. Trains ${p.daysPerWeek} days/week, ${p.sessionMins} min sessions.`);
  lines.push(`Body weight: now ${selectWeight(st).toFixed(1)} kg, started ${p.startWeightKg} kg, goal ${p.targetWeightKg} kg.`);
  lines.push(`Recent weigh-ins: ${st.weights.slice(-10).map((w) => `${w.date} ${w.kg}`).join('; ') || 'none'}`);
  lines.push(`Daily targets: ${t.kcal} kcal, ${t.protein} g protein, ${t.carbs} g carbs, ${t.fat} g fat (check-in adjustment so far: ${st.kcalAdjust} kcal).`);
  lines.push(`Eaten today: ${eaten.kcal} kcal, ${Math.round(eaten.protein)} g protein. Items: ${today.map((e) => e.name).join(', ') || 'nothing logged'}`);
  lines.push(`Last 7 days of food: ${wk.daysLogged} days logged${wk.avgKcal != null ? `, average ${wk.avgKcal} kcal and ${wk.avgProtein} g protein, protein target hit on ${wk.proteinHitDays} days` : ''}.`);
  lines.push(`Coach's current prescription: ${st.cardioMins} min cardio after each session, ${st.stepTarget} steps a day, training block: ${st.phase}.`);
  const since = Date.now() - 7 * 864e5;
  lines.push(`Cardio in the last 7 days: ${st.cardioLog.filter((x) => new Date(x.date).getTime() > since).map((x) => `${x.date} ${x.type} ${x.minutes}min`).join('; ') || 'none logged'}. Steps logged: ${Object.entries(st.steps).slice(-7).map(([d, n]) => `${d} ${n}`).join('; ') || 'none'}.`);
  lines.push(`Sessions this week: ${sessionsThisWeek(st.sessions)} of ${p.daysPerWeek}. Total sessions logged: ${st.sessions.length}.`);

  if (st.plan) {
    lines.push(`\nProgramme (${st.plan.split}); next up is ${st.plan.days[st.nextDay]?.name}:`);
    for (const d of st.plan.days) {
      lines.push(`- ${d.name}: ` + d.exercises.map((pe) => {
        const nt = nextTarget(st.sessions, pe, p.goal);
        return `${EX[pe.exId]?.name} ${nt.sets}x${pe.repMin}-${pe.repMax}${nt.kg ? ` @ ${nt.kg} kg` : ''} [${nt.trend}]`;
      }).join('; '));
    }
  }
  if (st.sessions.length) {
    lines.push('\nRecent sessions (most recent last):');
    for (const sn of st.sessions.slice(-6)) {
      lines.push(`- ${sn.date.slice(0, 10)} ${sn.dayName}, ${Math.round(sn.durationSec / 60)} min: ` + sn.entries.map((e) => `${EX[e.exId]?.name} ${e.sets.map((x) => `${x.kg ?? 'bw'}x${x.reps}`).join(',')}`).join('; '));
    }
  }
  const meals = st.mealPlan?.days[todayIndex()] ?? [];
  if (meals.length) lines.push(`\nToday's meal plan: ${meals.map((m) => `${m.slot}: ${MEAL[m.mealId].name} (${m.servings}x)`).join('; ')}`);
  lines.push(`Food preferences: diet ${st.foodPrefs.diet}; excluded: ${st.foodPrefs.dislikes.join(', ') || 'none'}.`);
  const last = st.checkins[st.checkins.length - 1];
  if (last) lines.push(`\nLast check-in (${last.date.slice(0, 10)}): energy ${last.energy}/5, sleep ${last.sleep}/5, hunger ${last.hunger}/5, adherence ${last.adherence}/5. Verdict: ${last.verdict}${last.notes ? ` Notes: ${last.notes}` : ''}`);
  const ins = weeklyInsights({ profile: p, targets: t, sessions: st.sessions, diary: st.diary, weights: st.weights, todayMeals: meals });
  if (ins.length) lines.push(`\nThe app's current read: ${ins.map((i) => i.title).join('; ')}`);
  return lines.join('\n');
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export class CoachError extends Error {}

export async function askCoach(history: ChatTurn[], context: string): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new CoachError('Add your Anthropic API key in Settings to talk to your coach.');
  // Loaded on first use so the SDK is never evaluated while the app is starting.
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  // The key is the user's own and lives only on their device, so direct calls are acceptable here.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 90_000 });
  try {
    const res = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      // If a safety filter declines a question, retry on a fallback model rather than failing the chat.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: [
        { type: 'text', text: INSTRUCTIONS },
        // The snapshot is fixed for the whole conversation so follow-up questions reuse the cached prefix.
        { type: 'text', text: `The user's data:\n${context}`, cache_control: { type: 'ephemeral' } },
      ],
      messages: history.map((m) => ({ role: m.role, content: m.text })),
    });
    if (res.stop_reason === 'refusal') throw new CoachError("I can't help with that one. Try asking it a different way.");
    const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n').trim();
    if (!text) throw new CoachError('No answer came back. Please try again.');
    return text;
  } catch (e) {
    if (e instanceof CoachError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new CoachError('That API key was rejected. Check it in Settings.');
    if (e instanceof Anthropic.PermissionDeniedError) throw new CoachError("Your API key doesn't have access to this model.");
    if (e instanceof Anthropic.RateLimitError) throw new CoachError('Too many requests, or your API credit has run out. Try again shortly.');
    if (e instanceof Anthropic.APIConnectionError) throw new CoachError("Couldn't reach the coach. Check your connection.");
    if (e instanceof Anthropic.APIError) throw new CoachError(`The coach hit a problem (${e.status ?? 'error'}). Try again.`);
    throw new CoachError('Something went wrong. Please try again.');
  }
}
