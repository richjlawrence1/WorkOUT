import type { CardioLog, CheckIn, DiaryEntry, PlanChange, Profile, Session, WeightEntry } from '../types';
import { CARDIO_MAX, PHASE_LABEL, STEPS_MAX, type Phase } from './prescription';
import { liftTrends } from './trends';
import { addDays, dayKey, fromKey } from './dates';
import { targetRate } from './nutrition';
import { fmtAmount } from './units';

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

export interface CoachState {
  cardioMins: number;
  stepTarget: number;
  steps: Record<string, number>;
  cardioLog: CardioLog[];
  phase: Phase;
  phaseWeeks: number;
  kcalTarget: number;
  mobilityTarget?: number;
  mobilityDone?: number;
}

/**
 * The weekly review. Reads weight, training, food, steps and recovery, then
 * moves one lever at a time in the order a coach would: movement first
 * (steps, then cardio), food last.
 */
export function buildCheckIn(
  profile: Profile,
  weights: WeightEntry[],
  sessions: Session[],
  diary: Record<string, DiaryEntry[]>,
  a: CheckInAnswers,
  coach: CoachState
): CheckIn {
  const amt = (kg: number) => fmtAmount(kg, profile.units);
  const since = addDays(new Date(), -7);
  const workoutsDone = sessions.filter((sn) => new Date(sn.date) > since).length;
  const loggedDays = Array.from({ length: 7 }, (_, i) => diary[dayKey(addDays(new Date(), -i))] ?? []).filter((d) => d.length);
  const avgKcal = loggedDays.length >= 3 ? Math.round(avg(loggedDays.map((d) => d.reduce((s, e) => s + e.kcal, 0))) as number) : null;
  const stepDays = Array.from({ length: 7 }, (_, i) => coach.steps[dayKey(addDays(new Date(), -i))]).filter((x): x is number => x > 0);
  const avgSteps = stepDays.length >= 3 ? Math.round((avg(stepDays) as number) / 100) * 100 : null;
  const cardioDone = coach.cardioLog.filter((x) => fromKey(x.date) > since).reduce((m, x) => m + x.minutes, 0);
  const cardioPlanned = coach.cardioMins * profile.daysPerWeek;

  const now = windowAvg(weights, 0);
  const before = windowAvg(weights, 7);
  const weightChange = now != null && before != null ? Math.round((now - before) * 10) / 10 : null;

  const actions: string[] = [];
  const changes: PlanChange[] = [];
  let kcalDelta = 0, cardioDelta = 0, stepDelta = 0;
  let verdict = 'Week logged. A few more weigh-ins and I can read your trend.';
  const followed = a.adherence >= 3;
  const cutting = profile.goal === 'lose' || profile.goal === 'recomp';

  if (weightChange != null && now != null) {
    const rate = weightChange / now;
    const [lo, hi] = targetRate(profile.goal);
    const dir = weightChange > 0 ? 'up' : 'down';
    const moved = weightChange === 0 ? 'flat' : `${dir} ${amt(weightChange)}`;

    if (rate > hi && cutting) {
      // Not losing fast enough.
      verdict = `Weight is ${moved} this week. That's slower than we want, so I'm turning the dial.`;
      if (!followed) {
        verdict = `Weight is ${moved}, but you told me the plan slipped this week.`;
        actions.push("Nothing changes yet. The plan can't be judged until it's been followed, so this week is about hitting it.");
      } else if (workoutsDone < Math.ceil(profile.daysPerWeek / 2)) {
        verdict = `Weight is ${moved}, and you trained ${workoutsDone} of ${profile.daysPerWeek} sessions.`;
        actions.push("I'm not adding cardio or cutting food on a week where the training didn't happen. Get the sessions in and we'll see what the plan really does.");
      } else if (avgSteps != null && avgSteps < coach.stepTarget * 0.85) {
        actions.push(`Your steps averaged ${avgSteps.toLocaleString()} against a ${coach.stepTarget.toLocaleString()} target. That's the gap to close first. Same plan, hit the steps.`);
      } else if (cardioPlanned > 0 && cardioDone < cardioPlanned * 0.6) {
        actions.push(`You did ${cardioDone} of ${cardioPlanned} planned cardio minutes. Get those done this week before I add more.`);
      } else if (coach.cardioMins < CARDIO_MAX) {
        cardioDelta = Math.min(CARDIO_MAX - coach.cardioMins, weightChange >= 0 ? 10 : 5);
      } else if (avgSteps != null && coach.stepTarget < STEPS_MAX) {
        stepDelta = 1000;
      } else {
        kcalDelta = -150;
      }
    } else if (rate < lo && cutting) {
      verdict = `Weight is ${moved}. That's faster than is good for holding muscle, so I'm easing off.`;
      if (coach.cardioMins > 15 && a.energy <= 3) cardioDelta = -5;
      else kcalDelta = 150;
    } else if (rate < lo) {
      verdict = `Weight is ${moved}. You need more fuel to grow.`;
      kcalDelta = 150;
    } else if (rate > hi) {
      verdict = `Weight is ${moved}, quicker than ideal. Easing calories back to keep the gain lean.`;
      if (followed) kcalDelta = -150;
    } else {
      verdict = `Weight is ${weightChange === 0 ? 'holding' : moved}. Right on pace, so the plan stays as it is.`;
    }
  } else {
    actions.push('Weigh in at least twice a week so I can read your trend and adjust your plan.');
  }

  // Training block: recovery when run down, heavier when lifts have stalled.
  const lifts = liftTrends(sessions);
  const tracked = lifts.up.length + lifts.flat.length + lifts.down.length;
  let phase: Phase = coach.phase;
  if (a.energy <= 2 && a.sleep <= 2 && coach.phase !== 'recovery') {
    phase = 'recovery';
  } else if (coach.phase === 'recovery') {
    phase = 'standard';
  } else if (coach.phase === 'heavy' && coach.phaseWeeks >= 3) {
    phase = 'standard';
  } else if (coach.phase === 'standard' && tracked >= 3 && lifts.up.length === 0 && workoutsDone >= Math.max(2, profile.daysPerWeek - 1)) {
    phase = 'heavy';
  }

  if (cardioDelta) {
    const to = coach.cardioMins + cardioDelta;
    changes.push({
      label: 'Cardio', from: `${coach.cardioMins} min`, to: `${to} min`,
      why: cardioDelta > 0
        ? `More movement before less food. ${cardioDelta} extra minutes after each session burns more without cutting what you eat.`
        : "You're losing quickly and energy isn't great, so some cardio comes off.",
    });
  }
  if (stepDelta) {
    changes.push({ label: 'Daily steps', from: coach.stepTarget.toLocaleString(), to: (coach.stepTarget + stepDelta).toLocaleString(), why: 'Cardio is at its ceiling, so the next lever is everyday movement.' });
  }
  if (kcalDelta) {
    changes.push({
      label: 'Calories', from: `${coach.kcalTarget}`, to: `${coach.kcalTarget + kcalDelta}`,
      why: kcalDelta < 0
        ? (cutting ? 'Cardio and steps are already as high as I want them, so food is the last lever left.' : 'A small trim keeps the gain from turning into fat.')
        : (cutting ? 'A little more food protects muscle and keeps your training quality up.' : 'More fuel so the training can turn into growth.'),
    });
  }
  if (phase !== coach.phase) {
    changes.push({
      label: 'Reps', from: PHASE_LABEL[coach.phase], to: PHASE_LABEL[phase],
      why: phase === 'recovery'
        ? 'Energy and sleep were both poor. One set comes off every lift this week so you can recover and come back stronger.'
        : phase === 'heavy'
          ? `None of your main lifts moved this week. Your big lifts drop two reps so the weight can go up. A new stimulus usually restarts progress.`
          : coach.phase === 'recovery'
            ? 'Recovery week is done. Back to your normal sets.'
            : 'Three weeks of heavier work banked. Reps go back up to build on the new strength.',
    });
  }

  if (workoutsDone >= profile.daysPerWeek) actions.push(`All ${profile.daysPerWeek} sessions done. Loads go up wherever you hit the top of your rep range.`);
  else if (workoutsDone === 0) actions.push('No sessions logged. Book the first one in your diary today, even a short one.');
  else actions.push(`${workoutsDone} of ${profile.daysPerWeek} sessions done. Next week, lock in the days in advance.`);

  if (cardioPlanned > 0 && !cardioDelta && cardioDone >= cardioPlanned) actions.push(`Cardio done: ${cardioDone} minutes against ${cardioPlanned} planned.`);
  if (avgSteps == null) actions.push('Log your steps on at least three days. They are the easiest lever I have, and I can only use what I can see.');
  if (coach.mobilityTarget) {
    const done = coach.mobilityDone ?? 0;
    actions.push(done >= coach.mobilityTarget
      ? `Mobility done: ${done} of ${coach.mobilityTarget} sessions.`
      : `Mobility: ${done} of ${coach.mobilityTarget} sessions. It's the part that keeps you training pain-free, so book ${coach.mobilityTarget - done === 1 ? 'it' : 'them'} in on rest days.`);
  }
  if (a.sleep <= 2 && phase !== 'recovery') actions.push('Sleep was poor. Aim for a fixed bedtime and no caffeine after 2pm; recovery drives progress.');
  if (a.hunger >= 4) actions.push('Hunger is high. Lean on protein and high-volume foods: potatoes, veg, fruit, yoghurt.');
  if (avgKcal == null) actions.push('Log your food on at least three days so I can compare intake against your target.');
  if (!changes.length && weightChange != null) actions.unshift('No changes this week. Same calories, cardio and steps.');

  return {
    date: new Date().toISOString(),
    weightKg: now != null ? Math.round(now * 10) / 10 : null,
    weightChange,
    workoutsDone,
    workoutsPlanned: profile.daysPerWeek,
    avgKcal,
    ...a,
    kcalDelta,
    cardioDelta,
    stepDelta,
    phase,
    changes,
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
