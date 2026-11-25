export type Slot =
  | 'chest_press' | 'incline_press' | 'chest_fly' | 'shoulder_press' | 'lateral' | 'rear_delt'
  | 'triceps' | 'row' | 'pulldown' | 'biceps' | 'squat' | 'quad_iso' | 'lunge' | 'hinge'
  | 'ham_curl' | 'glute' | 'calf' | 'core';

export type Level = 'beginner' | 'intermediate' | 'advanced';

export interface Exercise {
  id: string;
  name: string;
  slot: string;
  equipment: string[];
  compound: boolean;
  level: string;
  timed: boolean;
  bodyweight: boolean;
  primary: string[];
  secondary: string[];
  instructions: string[];
}

export type Goal = 'lose' | 'build' | 'recomp' | 'strength';
export type Sex = 'male' | 'female';
export type Activity = 'desk' | 'light' | 'active' | 'very';

export interface Profile {
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  startWeightKg: number;
  targetWeightKg: number;
  goal: Goal;
  experience: Level;
  daysPerWeek: number;
  sessionMins: number;
  activity: Activity;
  equipment: string[];
  weighInDay: number; // 0 = Sunday
  units?: 'kg' | 'lb' | 'st'; // body-weight display; lifts are always kg
}

export interface PlanExercise {
  exId: string;
  slot: Slot;
  sets: number;
  repMin: number;
  repMax: number;
}
export interface PlanDay {
  id: string;
  name: string;
  focus: string;
  exercises: PlanExercise[];
}
export interface Plan {
  createdAt: string;
  split: string;
  days: PlanDay[];
}

export interface SetLog {
  kg: number | null;
  reps: number | null;
  done: boolean;
}
export interface SessionEntry {
  exId: string;
  repMin: number;
  repMax: number;
  note?: string; // today's instruction
  why?: string; // coach's reasoning
  last?: string | null; // what happened last time
  goal?: string; // what the exercise is building towards
  trend?: 'up' | 'same' | 'down' | 'new' | 'volume';
  easy?: boolean; // deliberately light day: ignored by progression
  sets: SetLog[];
}
export interface Session {
  id: string;
  date: string; // ISO datetime started
  dayId: string;
  dayName: string;
  durationSec: number;
  entries: SessionEntry[];
}

export interface WeightEntry {
  date: string; // YYYY-MM-DD
  kg: number;
}

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Meal extends Macros {
  id: string;
  name: string;
  slot: MealSlot;
  mins: number;
  tags: string[]; // ingredient/diet tags used for exclusions
  ingredients: [string, string][]; // [item, quantity]
  method: string;
}

export interface PlannedMeal {
  mealId: string;
  slot: MealSlot;
  servings: number;
}
export interface MealPlan {
  weekStart: string;
  days: PlannedMeal[][]; // 7 days, Monday first
}

export interface FoodPrefs {
  diet: 'any' | 'pescatarian' | 'vegetarian' | 'vegan';
  dislikes: string[];
  snacks: number; // snacks per day
  set: boolean;
}

export interface Food extends Macros {
  id: string;
  name: string;
  brand?: string;
  serving: string; // e.g. "100 g", "1 pot (150 g)"
  barcode?: string;
}

export interface DiaryEntry extends Macros {
  id: string;
  name: string;
  detail: string;
  slot: MealSlot;
}

export interface PhotoSet {
  date: string; // YYYY-MM-DD
  front?: string;
  side?: string;
  back?: string;
}

export interface CheckIn {
  date: string;
  weightKg: number | null;
  weightChange: number | null; // vs previous check-in average
  workoutsDone: number;
  workoutsPlanned: number;
  avgKcal: number | null;
  energy: number;
  sleep: number;
  hunger: number;
  adherence: number;
  notes: string;
  kcalDelta: number;
  verdict: string;
  actions: string[];
}
