import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { latestWeight } from './lib/checkin';
import { dayKey, uid, weekStart } from './lib/dates';
import { generateMealPlan, swapMeal } from './lib/mealplan';
import { targets } from './lib/nutrition';
import { DEFAULT_REMINDERS, type ReminderPrefs } from './lib/notify';
import { deletePhoto } from './lib/photos';
import { EX, generatePlan, prescription } from './lib/plan';
import { type Phase, initialCardio, initialSteps, phasedDay } from './lib/prescription';
import { buildEntries } from './lib/progression';
import type {
  CardioLog, CheckIn, DiaryEntry, Food, FoodPrefs, Macros, MealPlan, PhotoSet, Plan, Profile, Session, SessionEntry, Slot, WeightEntry,
} from './types';

interface Active {
  warmupDone?: boolean;
  cardio?: { minutes: number; type: string } | null;
  startedAt: string;
  dayId: string;
  dayName: string;
  entries: SessionEntry[];
}

interface State {
  hydrated: boolean;
  profile: Profile | null;
  onboardedAt: string | null;
  plan: Plan | null;
  planSeed: number;
  nextDay: number;
  sessions: Session[];
  active: Active | null;
  weights: WeightEntry[];
  checkins: CheckIn[];
  kcalAdjust: number;
  foodPrefs: FoodPrefs;
  favMeals: string[];
  mealPlan: MealPlan | null;
  diary: Record<string, DiaryEntry[]>;
  recentFoods: Food[];
  photos: PhotoSet[];
  reminders: ReminderPrefs;
  supermarket: string;
  cardioMins: number;
  stepTarget: number;
  steps: Record<string, number>;
  cardioLog: CardioLog[];
  phase: Phase;
  phaseWeeks: number;

  completeOnboarding: (p: Profile) => void;
  updateProfile: (patch: Partial<Profile>, regenerate?: boolean) => void;
  regeneratePlan: () => void;
  swapExercise: (dayId: string, index: number, exId: string) => void;
  startWorkout: (dayIndex: number, entries?: SessionEntry[]) => void;
  setReminders: (r: ReminderPrefs) => void;
  patchActive: (p: Partial<Pick<Active, 'warmupDone' | 'cardio'>>) => void;
  logSteps: (n: number, date?: string) => void;
  logCardio: (minutes: number, type: string) => void;
  removeCardio: (id: string) => void;
  setSupermarket: (s: string) => void;
  updateActive: (entries: SessionEntry[]) => void;
  finishWorkout: () => Session | null;
  discardWorkout: () => void;
  logWeight: (kg: number, date?: string) => void;
  addCheckIn: (ci: CheckIn) => void;
  setPhoto: (date: string, angle: 'front' | 'side' | 'back', ref: string) => void;
  setFoodPrefs: (p: FoodPrefs) => void;
  toggleFav: (mealId: string) => void;
  buildMealPlan: () => void;
  swapPlanned: (dayIdx: number, idx: number, toId?: string) => void;
  addDiary: (date: string, e: Omit<DiaryEntry, 'id'>, food?: Food) => void;
  removeDiary: (date: string, id: string) => void;
  reset: () => void;
}

const initial = {
  profile: null,
  onboardedAt: null,
  plan: null,
  planSeed: 0,
  nextDay: 0,
  sessions: [],
  active: null,
  weights: [],
  checkins: [],
  kcalAdjust: 0,
  foodPrefs: { diet: 'any', dislikes: [], snacks: 1, set: false } as FoodPrefs,
  favMeals: [],
  mealPlan: null,
  diary: {},
  recentFoods: [],
  photos: [] as PhotoSet[],
  reminders: DEFAULT_REMINDERS,
  supermarket: '',
  cardioMins: 15,
  stepTarget: 8000,
  steps: {} as Record<string, number>,
  cardioLog: [] as CardioLog[],
  phase: 'standard' as Phase,
  phaseWeeks: 0,
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,
      ...initial,

      completeOnboarding: (p) =>
        set({
          profile: p,
          onboardedAt: new Date().toISOString(),
          plan: generatePlan(p),
          nextDay: 0,
          weights: [{ date: dayKey(), kg: p.startWeightKg }],
          cardioMins: initialCardio(p.goal),
          stepTarget: initialSteps(p.goal),
        }),

      updateProfile: (patch, regenerate) => {
        const profile = { ...(get().profile as Profile), ...patch };
        set(regenerate ? { profile, plan: generatePlan(profile, get().planSeed), nextDay: 0 } : { profile });
      },

      regeneratePlan: () => {
        const { profile, planSeed } = get();
        if (!profile) return;
        set({ plan: generatePlan(profile, planSeed + 1), planSeed: planSeed + 1, nextDay: 0 });
      },

      swapExercise: (dayId, index, exId) => {
        const { plan, profile } = get();
        if (!plan || !profile) return;
        const ex = EX[exId];
        set({
          plan: {
            ...plan,
            days: plan.days.map((d) =>
              d.id !== dayId
                ? d
                : { ...d, exercises: d.exercises.map((pe, i) => (i === index ? { exId, slot: ex.slot as Slot, ...prescription(ex, profile) } : pe)) }
            ),
          },
        });
      },

      setReminders: (reminders) => set({ reminders }),

      patchActive: (p) => {
        const a = get().active;
        if (a) set({ active: { ...a, ...p } });
      },
      logSteps: (n, date = dayKey()) => set({ steps: { ...get().steps, [date]: Math.max(0, Math.round(n)) } }),
      logCardio: (minutes, type) => set({ cardioLog: [...get().cardioLog, { id: uid(), date: dayKey(), minutes: Math.round(minutes), type }] }),
      removeCardio: (id) => set({ cardioLog: get().cardioLog.filter((x) => x.id !== id) }),
      setSupermarket: (supermarket) => set({ supermarket }),

      startWorkout: (dayIndex, entries) => {
        const { plan, sessions, profile, phase } = get();
        const day = plan?.days[dayIndex] ? phasedDay(plan.days[dayIndex], phase) : undefined;
        if (!day) return;
        set({ active: { startedAt: new Date().toISOString(), dayId: day.id, dayName: day.name, entries: entries ?? buildEntries(day, sessions, profile?.goal) } });
      },

      updateActive: (entries) => {
        const a = get().active;
        if (a) set({ active: { ...a, entries } });
      },

      finishWorkout: () => {
        const { active, sessions, plan } = get();
        if (!active) return null;
        // Cardio ticked off in the session counts even if no sets were logged.
        if (active.cardio && active.cardio.minutes > 0) get().logCardio(active.cardio.minutes, active.cardio.type);
        const entries = active.entries
          .map((e) => ({ ...e, sets: e.sets.filter((st) => st.done) }))
          .filter((e) => e.sets.length);
        if (!entries.length) {
          set({ active: null });
          return null;
        }
        const sn: Session = {
          id: uid(),
          date: active.startedAt,
          dayId: active.dayId,
          dayName: active.dayName,
          durationSec: Math.round((Date.now() - new Date(active.startedAt).getTime()) / 1000),
          entries,
        };
        const idx = plan?.days.findIndex((d) => d.id === active.dayId) ?? -1;
        set({
          active: null,
          sessions: [...sessions, sn],
          nextDay: plan && idx >= 0 ? (idx + 1) % plan.days.length : get().nextDay,
        });
        return sn;
      },

      discardWorkout: () => set({ active: null }),

      logWeight: (kg, date = dayKey()) =>
        set({ weights: [...get().weights.filter((w) => w.date !== date), { date, kg }].sort((a, b) => a.date.localeCompare(b.date)) }),

      addCheckIn: (ci) => {
        const st = get();
        const phase = ci.phase ?? st.phase;
        set({
          checkins: [...st.checkins, ci],
          kcalAdjust: st.kcalAdjust + ci.kcalDelta,
          cardioMins: Math.max(0, st.cardioMins + (ci.cardioDelta ?? 0)),
          stepTarget: st.stepTarget + (ci.stepDelta ?? 0),
          phase,
          phaseWeeks: phase === st.phase ? st.phaseWeeks + 1 : 0,
        });
      },

      setPhoto: (date, angle, ref) => {
        const photos = get().photos;
        const cur = photos.find((p) => p.date === date);
        if (cur?.[angle]) deletePhoto(cur[angle] as string);
        const next = { ...(cur ?? { date }), [angle]: ref };
        set({ photos: [...photos.filter((p) => p.date !== date), next].sort((a, b) => a.date.localeCompare(b.date)) });
      },

      setFoodPrefs: (p) => set({ foodPrefs: { ...p, set: true } }),

      toggleFav: (mealId) => {
        const favs = get().favMeals;
        set({ favMeals: favs.includes(mealId) ? favs.filter((x) => x !== mealId) : [...favs, mealId] });
      },

      buildMealPlan: () => {
        const t = selectTargets(get());
        if (t) set({ mealPlan: generateMealPlan(get().foodPrefs, get().favMeals, t) });
      },

      swapPlanned: (dayIdx, idx, toId) => {
        const { mealPlan, foodPrefs } = get();
        const t = selectTargets(get());
        if (mealPlan && t) set({ mealPlan: swapMeal(mealPlan, dayIdx, idx, foodPrefs, t, toId) });
      },

      addDiary: (date, e, food) => {
        const diary = get().diary;
        const recent = food ? [food, ...get().recentFoods.filter((x) => x.id !== food.id)].slice(0, 30) : get().recentFoods;
        set({ diary: { ...diary, [date]: [...(diary[date] ?? []), { ...e, id: uid() }] }, recentFoods: recent });
      },

      removeDiary: (date, id) => {
        const diary = get().diary;
        set({ diary: { ...diary, [date]: (diary[date] ?? []).filter((x) => x.id !== id) } });
      },

      reset: () => {
        get().photos.forEach((p) => [p.front, p.side, p.back].forEach((r) => r && deletePhoto(r)));
        set({ ...initial });
      },
    }),
    {
      name: 'workout-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hydrated, ...rest }) => rest,
      onRehydrateStorage: () => () => useStore.setState({ hydrated: true }),
    }
  )
);

export const selectWeight = (st: Pick<State, 'weights' | 'profile'>): number =>
  latestWeight(st.weights, st.profile?.startWeightKg ?? 75);

export const selectTargets = (st: Pick<State, 'weights' | 'profile' | 'kcalAdjust'>): Macros | null =>
  st.profile ? targets(st.profile, selectWeight(st), st.kcalAdjust) : null;

export const sessionsThisWeek = (sessions: Session[]): number => {
  const ws = weekStart().getTime();
  return sessions.filter((sn) => new Date(sn.date).getTime() >= ws).length;
};
