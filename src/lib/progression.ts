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

/**
 * How far into a session a lift is done. You are strongest on the first lifts
 * and weaker by the end, so history is only compared within the same stage.
 */
export type Stage = 'early' | 'mid' | 'late';
const STAGES: Stage[] = ['early', 'mid', 'late'];
export const stageOf = (pos: number): Stage => (pos <= 1 ? 'early' : pos <= 3 ? 'mid' : 'late');
export const STAGE_LABEL: Record<Stage, string> = { early: 'early in the session', mid: 'mid-session', late: 'late in the session' };
export const ordinal = (pos: number): string => ['1st', '2nd', '3rd'][pos] ?? `${pos + 1}th`;
/** Strength lost per stage of fatigue, used only until real history exists for a stage. */
const FATIGUE_PER_STAGE = 0.05;

/** Position of an entry within its session. Older records fall back to list order. */
export const entryPos = (sn: Session, e: SessionEntry): number => e.pos ?? Math.max(0, sn.entries.indexOf(e));

const usable = (x: SessionEntry, exId: string) => x.exId === exId && !x.easy && x.sets.some((st) => st.done);

/** Most recent entries for a lift, newest first. With `stage`, only ones done at that point in a session. */
export const lastEntries = (sessions: Session[], exId: string, n = 2, stage?: Stage): SessionEntry[] => {
  const out: SessionEntry[] = [];
  for (let i = sessions.length - 1; i >= 0 && out.length < n; i--) {
    const sn = sessions[i];
    const e = sn.entries.find((x) => usable(x, exId) && (!stage || stageOf(entryPos(sn, x)) === stage));
    if (e) out.push(e);
  }
  return out;
};

/** The single most recent entry for a lift at any point in a session, with where it was done. */
export const lastAnywhere = (sessions: Session[], exId: string): { entry: SessionEntry; pos: number } | null => {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const e = sessions[i].entries.find((x) => usable(x, exId));
    if (e) return { entry: e, pos: entryPos(sessions[i], e) };
  }
  return null;
};

const doneSets = (e: SessionEntry) => e.sets.filter((st) => st.done && st.reps != null);

export interface Target {
  kg: number | null;
  reps: number;
  sets: number;
  trend: 'up' | 'same' | 'down' | 'new' | 'volume' | 'moved';
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
export function nextTarget(sessions: Session[], pe: PlanExercise, userGoal: Goal = 'recomp', pos = 0): Target {
  const { exId, repMin, repMax, sets: baseSets } = pe;
  const ex = EX[exId];
  const stage = stageOf(pos);
  // Only sessions where this lift sat at the same point count as its history.
  const [last, prev, third] = lastEntries(sessions, exId, 3, stage);
  const unit = ex?.timed ? 'sec' : 'reps';
  const goal = `${repMin}-${repMax} ${unit} is the range for this lift. The aim is to ${GOAL_LINE[userGoal]}.`;
  if (!last) {
    const other = lastAnywhere(sessions, exId);
    if (other) {
      // Done before, but at a different point in a session: translate it rather than start from scratch.
      const sets = doneSets(other.entry);
      const kg = Math.max(...sets.map((st) => st.kg ?? 0)) || null;
      const worst = Math.min(...sets.map((st) => st.reps as number));
      const shift = STAGES.indexOf(stage) - STAGES.indexOf(stageOf(other.pos));
      const later = shift > 0;
      const was = `Last time this was your ${ordinal(other.pos)} lift (${describe(other.entry, unit)}).`;
      const today = `Today it's your ${ordinal(pos)}`;
      if (kg && !ex?.bodyweight) {
        const step = increment(exId);
        const adj = roundTo(kg * (1 - FATIGUE_PER_STAGE * shift), step);
        const pct = Math.round(Math.abs(FATIGUE_PER_STAGE * shift) * 100);
        return {
          kg: adj, reps: Math.min(repMax, Math.max(repMin, worst)), sets: baseSets, trend: 'moved', last: was, goal,
          note: later ? `Start at ${adj} kg. You're further into the session today.` : `Start at ${adj} kg. You're fresher for this today.`,
          why: later
            ? `${today}, with ${pos} lift${pos === 1 ? '' : 's'} already in your legs and arms, so I've taken about ${pct}% off. That isn't you getting weaker: nobody lifts the same at the end of a session as at the start. From now on I track this lift at this point in the session separately, so its history compares like with like.`
            : `${today}, so you're fresher than when you last did it, and I've added about ${pct}%. From now on I track this lift at this point in the session separately, so its history compares like with like.`,
        };
      }
      if (!kg) {
        const t = Math.min(repMax, Math.max(repMin, worst - shift));
        return {
          kg: null, reps: t, sets: baseSets, trend: 'moved', last: was, goal,
          note: `Aim for ${t} ${unit} on every set.`,
          why: `${today}. ${later ? 'You will be more tired than last time, so the target is a touch lower.' : 'You are fresher than last time, so the target is a touch higher.'} I track this lift at this point in the session separately from now on.`,
        };
      }
    }
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
  const lastLine = `Last time as your ${ordinal(last.pos ?? pos)} lift: ${describe(last, unit)}.`;

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
  return day.exercises.map((pe, pos) => {
    const t = nextTarget(sessions, pe, goal, pos);
    const sets: SetLog[] = Array.from({ length: t.sets }, () => ({ kg: t.kg, reps: t.reps, done: false }));
    return { exId: pe.exId, repMin: pe.repMin, repMax: pe.repMax, note: t.note, why: t.why, last: t.last, goal: t.goal, trend: t.trend, pos, sets };
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

/** Best estimated one-rep max. With `stage`, only from sessions where the lift sat at that point. */
export const bestE1rm = (sessions: Session[], exId: string, stage?: Stage): number =>
  sessions.reduce((best, sn) => {
    const e = sn.entries.find((x) => x.exId === exId && (!stage || stageOf(entryPos(sn, x)) === stage));
    if (!e) return best;
    return Math.max(best, ...e.sets.filter((st) => st.done && st.kg && st.reps).map((st) => e1rm(st.kg as number, st.reps as number)));
  }, 0);

/** Personal records set in `sn` compared with everything before it. */
export function sessionPRs(before: Session[], sn: Session): { exId: string; e1rm: number; stage: Stage }[] {
  return sn.entries
    .map((e) => {
      const now = Math.max(0, ...e.sets.filter((st) => st.done && st.kg && st.reps).map((st) => e1rm(st.kg as number, st.reps as number)));
      // A record is judged against the same point in a session, so a late-session best still counts.
      const stage = stageOf(entryPos(sn, e));
      const old = bestE1rm(before, e.exId, stage);
      return now > 0 && old > 0 && now > old + 0.01 ? { exId: e.exId, e1rm: now, stage } : null;
    })
    .filter((x): x is { exId: string; e1rm: number; stage: Stage } => !!x);
}

/** One-paragraph briefing for a whole session, used on the Today screen. */
export function sessionBrief(day: PlanDay, sessions: Session[], goal: Goal): string {
  const ts = day.exercises.map((pe, pos) => ({ name: EX[pe.exId]?.name ?? '', t: nextTarget(sessions, pe, goal, pos) }));
  const pick = (k: Target['trend']) => ts.filter((x) => x.t.trend === k).map((x) => x.name);
  const list = (xs: string[]) => (xs.length > 2 ? `${xs.slice(0, 2).join(', ')} and ${xs.length - 2} more` : xs.join(' and '));
  const up = pick('up'), vol = pick('volume'), down = pick('down'), fresh = pick('new'), moved = pick('moved');
  if (fresh.length === ts.length) return "First run at this session. Today is about finding your working weights, so start lighter than you think and log everything. I set the targets from here.";
  const parts: string[] = [];
  if (up.length) parts.push(`Weight goes up on ${list(up)} because you hit the top of the rep range last time.`);
  if (vol.length) parts.push(`An extra set on ${list(vol)} to push past a stall.`);
  if (down.length) parts.push(`${list(down)} is lighter on purpose so you can recover and rebuild.`);
  if (moved.length) parts.push(`${list(moved)} ${moved.length > 1 ? 'are' : 'is'} at a different point in the session than before, so the weight is adjusted for how fresh you'll be.`);
  if (fresh.length) parts.push(`${list(fresh)} is new, so find a starting weight.`);
  if (!parts.length) parts.push('Weights stay where they were. The job today is one more rep per set than last time.');
  else if (up.length + vol.length + down.length + fresh.length + moved.length < ts.length) parts.push('Everything else: same weight, one more rep.');
  return parts.join(' ');
}
