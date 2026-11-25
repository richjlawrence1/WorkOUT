import type { Goal, PlanDay, PlanExercise, Session, SessionEntry, SetLog } from '../types';
import { EX } from './plan';

/** Smallest sensible jump for the kit an exercise uses. */
export const increment = (exId: string): number => {
  const ex = EX[exId];
  if (!ex) return 2.5;
  if (ex.equipment.includes('dumbbells') || ex.equipment.includes('kettlebell')) return 2;
  if (ex.equipment.includes('barbell') && ['squat', 'hinge', 'glute'].includes(ex.slot)) return 5;
  return 2.5;
};

const roundTo = (kg: number, step: number) => Math.max(step, Math.round(kg / step) * step);

export const lastEntries = (sessions: Session[], exId: string, n = 2): SessionEntry[] => {
  const out: SessionEntry[] = [];
  for (let i = sessions.length - 1; i >= 0 && out.length < n; i--) {
    const e = sessions[i].entries.find((x) => x.exId === exId && !x.easy && x.sets.some((st) => st.done));
    if (e) out.push(e);
  }
  return out;
};

const doneSets = (e: SessionEntry) => e.sets.filter((st) => st.done && st.reps != null);

export interface Target {
  kg: number | null;
  reps: number;
  sets: number;
  trend: 'up' | 'same' | 'down' | 'new' | 'volume';
  /** Short instruction for today. */
  note: string;
  /** The coach's reasoning for today's prescription. */
  why: string;
  /** What happened last time, in plain words. */
  last: string | null;
  /** What this exercise is building towards. */
  goal: string;
}

const GOAL_LINE: Record<Goal, string> = {
  lose: 'keep your muscle while the fat comes off. Heavy, controlled lifting is the signal that tells your body to hold on to it',
  build: 'add muscle. That comes from taking sets close to failure and adding load or reps over the weeks',
  recomp: 'get leaner and stronger at the same time, by progressing the load while your calories stay tight',
  strength: 'move more weight. Low reps with long rests teach your body to produce force',
};

const describe = (e: SessionEntry, unit: string): string => {
  const sets = doneSets(e);
  const kg = Math.max(...sets.map((st) => st.kg ?? 0));
  const reps = sets.map((st) => st.reps).join(', ');
  return kg ? `${kg} kg for ${reps} ${unit}` : `${reps} ${unit}`;
};

/**
 * Double progression with a volume lever:
 *  - every set reached the top of the range      -> add weight, restart at the bottom
 *  - three sessions stuck at one weight           -> add a set to break the plateau
 *  - two sessions running below the range         -> 10% lighter, one set fewer, rebuild
 *  - otherwise                                    -> same weight, aim for one more rep
 * Every branch returns the reasoning so the coach can explain it in the session.
 */
export function nextTarget(sessions: Session[], pe: PlanExercise, userGoal: Goal = 'recomp'): Target {
  const { exId, repMin, repMax, sets: baseSets } = pe;
  const ex = EX[exId];
  const [last, prev, third] = lastEntries(sessions, exId, 3);
  const unit = ex?.timed ? 'sec' : 'reps';
  const goal = `${repMin}-${repMax} ${unit} is the range for this lift. The aim is to ${GOAL_LINE[userGoal]}.`;
  if (!last) {
    return {
      kg: null, reps: repMin, sets: baseSets, trend: 'new', last: null, goal,
      note: ex?.bodyweight ? `Aim for ${repMin}-${repMax} ${unit} with clean form.` : `Find a weight you could lift for about ${repMax + 2} reps.`,
      why: ex?.bodyweight
        ? 'First time on this one, so today sets your baseline. Stop each set with a rep or two left.'
        : "First time on this one, so today sets your baseline. Start lighter than you think and log what you lift. From next session I set the weight for you.",
    };
  }
  const sets = doneSets(last);
  const reps = sets.map((st) => st.reps as number);
  const worst = Math.min(...reps);
  const kg = Math.max(...sets.map((st) => st.kg ?? 0)) || null;
  const step = increment(exId);
  const lastLine = `Last time: ${describe(last, unit)}.`;

  if (ex?.bodyweight && !kg) {
    if (worst >= repMax) {
      return {
        kg: null, reps: repMax, sets: baseSets + 1, trend: 'volume', last: lastLine, goal,
        note: `${baseSets + 1} sets of ${repMax} ${unit} today.`,
        why: `You hit ${repMax} on every set, so the top of the range is no longer a challenge. With no weight to add, the lever is volume: one extra set today. Slow the lowering to 3 seconds if it still feels easy.`,
      };
    }
    const t = Math.min(repMax, worst + 1);
    return {
      kg: null, reps: t, sets: baseSets, trend: 'same', last: lastLine, goal,
      note: `Aim for ${t} ${unit} on every set.`,
      why: `Your lowest set was ${worst}. Beating that by one is how bodyweight work progresses: a rep at a time until you own ${repMax}.`,
    };
  }
  if (kg == null) {
    return { kg: null, reps: repMin, sets: baseSets, trend: 'new', last: lastLine, goal, note: 'Log a weight today.', why: 'I need a logged weight to start setting your targets.' };
  }

  const topKg = (e?: SessionEntry) => (e ? Math.max(...doneSets(e).map((st) => st.kg ?? 0)) : 0);
  const low = (e?: SessionEntry) => (e && doneSets(e).length ? Math.min(...doneSets(e).map((st) => st.reps as number)) : Infinity);

  if (worst >= repMax) {
    return {
      kg: kg + step, reps: repMin, sets: baseSets, trend: 'up', last: lastLine, goal,
      note: `Up to ${kg + step} kg. Aim for ${repMin}+ reps.`,
      why: `You reached ${repMax} reps on every set at ${kg} kg. That means you've outgrown that weight, so it goes up ${step} kg. Reps drop back to ${repMin} on purpose: heavier weight, fewer reps, then we build back up to ${repMax}.`,
    };
  }
  if (worst < repMin && prev && low(prev) < repMin && topKg(prev) >= kg) {
    const lighter = roundTo(kg * 0.9, step);
    const fewer = Math.max(2, baseSets - 1);
    return {
      kg: lighter, reps: repMax - 1, sets: fewer, trend: 'down', last: lastLine, goal,
      note: `Lighter today: ${lighter} kg, ${fewer} sets.`,
      why: `Two sessions in a row you've fallen short of ${repMin} reps at ${kg} kg. That's fatigue, not weakness, and grinding at the same weight won't fix it. So today is deliberately lighter and one set shorter. Hit clean reps, recover, and you'll come back through ${kg} kg stronger.`,
    };
  }
  if (prev && third && topKg(prev) === kg && topKg(third) === kg && worst <= low(third)) {
    return {
      kg, reps: Math.max(repMin, worst), sets: baseSets + 1, trend: 'volume', last: lastLine, goal,
      note: `Extra set today: ${baseSets + 1} sets at ${kg} kg.`,
      why: `Three sessions at ${kg} kg and the reps haven't moved. When load stalls, more total work is what restarts progress, so I've added a set. Once the reps climb again it comes back off.`,
    };
  }
  const target = Math.min(repMax, Math.max(repMin, worst + 1));
  return {
    kg, reps: target, sets: baseSets, trend: 'same', last: lastLine, goal,
    note: `Stay at ${kg} kg. Aim for ${target} on every set.`,
    why: `The weight stays the same because your lowest set was ${worst} and the bar only goes up once every set reaches ${repMax}. One more rep per set today moves you ${target >= repMax ? 'to the point where we add weight' : 'closer to that'}.`,
  };
}

export function buildEntries(day: PlanDay, sessions: Session[], goal: Goal = 'recomp'): SessionEntry[] {
  return day.exercises.map((pe) => {
    const t = nextTarget(sessions, pe, goal);
    const sets: SetLog[] = Array.from({ length: t.sets }, () => ({ kg: t.kg, reps: t.reps, done: false }));
    return { exId: pe.exId, repMin: pe.repMin, repMax: pe.repMax, note: t.note, why: t.why, last: t.last, goal: t.goal, trend: t.trend, sets };
  });
}

/** What the coach says straight after a set, judged against the target range. */
export function setFeedback(e: SessionEntry, setIndex: number): string {
  const ex = EX[e.exId];
  const set = e.sets[setIndex];
  const reps = set.reps ?? 0;
  const left = e.sets.filter((x) => !x.done).length;
  const unit = ex?.timed ? 'seconds' : 'reps';
  if (reps >= e.repMax) {
    const all = e.sets.every((x) => x.done && (x.reps ?? 0) >= e.repMax);
    if (!left) return all ? `Every set at ${e.repMax}. That earns a heavier weight next session.` : `Strong finish. Get every set to ${e.repMax} and the weight goes up.`;
    return `${reps} ${unit}: top of the range. Match it on the next ${left === 1 ? 'set' : `${left} sets`} and the weight goes up next time.`;
  }
  if (reps < e.repMin) {
    return left
      ? `${reps} is under the ${e.repMin}-${e.repMax} target. Take the full rest, and if the next set drops again, take a little weight off.`
      : `${reps} on the last set is fine, fatigue is expected there. I'll keep the weight where it is next time.`;
  }
  return left ? `${reps} ${unit}, right in the range. Rest, then try to match it.` : `Solid. In the range on the final set. Next time we chase one more rep.`;
}

/** Epley estimated one-rep max. */
export const e1rm = (kg: number, reps: number) => (reps <= 1 ? kg : kg * (1 + reps / 30));

export const sessionVolume = (sn: Session): number =>
  sn.entries.reduce((v, e) => v + e.sets.reduce((a, st) => a + (st.done ? (st.kg ?? 0) * (st.reps ?? 0) : 0), 0), 0);

export const bestE1rm = (sessions: Session[], exId: string): number =>
  sessions.reduce((best, sn) => {
    const e = sn.entries.find((x) => x.exId === exId);
    if (!e) return best;
    return Math.max(best, ...e.sets.filter((st) => st.done && st.kg && st.reps).map((st) => e1rm(st.kg as number, st.reps as number)));
  }, 0);

/** Personal records set in `sn` compared with everything before it. */
export function sessionPRs(before: Session[], sn: Session): { exId: string; e1rm: number }[] {
  return sn.entries
    .map((e) => {
      const now = Math.max(0, ...e.sets.filter((st) => st.done && st.kg && st.reps).map((st) => e1rm(st.kg as number, st.reps as number)));
      const old = bestE1rm(before, e.exId);
      return now > 0 && old > 0 && now > old + 0.01 ? { exId: e.exId, e1rm: now } : null;
    })
    .filter((x): x is { exId: string; e1rm: number } => !!x);
}

/** One-paragraph briefing for a whole session, used on the Today screen. */
export function sessionBrief(day: PlanDay, sessions: Session[], goal: Goal): string {
  const ts = day.exercises.map((pe) => ({ name: EX[pe.exId]?.name ?? '', t: nextTarget(sessions, pe, goal) }));
  const pick = (k: Target['trend']) => ts.filter((x) => x.t.trend === k).map((x) => x.name);
  const list = (xs: string[]) => (xs.length > 2 ? `${xs.slice(0, 2).join(', ')} and ${xs.length - 2} more` : xs.join(' and '));
  const up = pick('up'), vol = pick('volume'), down = pick('down'), fresh = pick('new');
  if (fresh.length === ts.length) return "First run at this session. Today is about finding your working weights, so start lighter than you think and log everything. I set the targets from here.";
  const parts: string[] = [];
  if (up.length) parts.push(`Weight goes up on ${list(up)} because you hit the top of the rep range last time.`);
  if (vol.length) parts.push(`An extra set on ${list(vol)} to push past a stall.`);
  if (down.length) parts.push(`${list(down)} is lighter on purpose so you can recover and rebuild.`);
  if (fresh.length) parts.push(`${list(fresh)} is new, so find a starting weight.`);
  if (!parts.length) parts.push('Weights stay where they were. The job today is one more rep per set than last time.');
  else if (up.length + vol.length + down.length + fresh.length < ts.length) parts.push('Everything else: same weight, one more rep.');
  return parts.join(' ');
}
