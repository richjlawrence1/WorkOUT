import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EquipmentPicker } from '../components/EquipmentPicker';
import { DAYS } from '../lib/dates';
import { targets } from '../lib/nutrition';
import { ALL_EQUIPMENT, generatePlan } from '../lib/plan';
import { useStore } from '../store';
import { APP_NAME, c, f, s } from '../theme';
import type { Activity, Goal, Level, Profile, Sex } from '../types';
import { Body, Button, Card, Chip, ChipRow, Eyebrow, Field, Header, Option, Row, Rule, Screen, Small, Stat, Stepper, Title } from '../ui';

const GOALS: [Goal, string, string][] = [
  ['lose', 'Lose fat', 'Drop body fat while keeping your muscle'],
  ['build', 'Build muscle', 'Add size with a controlled surplus'],
  ['recomp', 'Tone & recomp', 'Leaner and stronger at a similar weight'],
  ['strength', 'Get stronger', 'Heavier lifts, lower reps'],
];
const LEVELS: [Level, string, string][] = [
  ['beginner', 'New to lifting', 'Under a year of consistent training'],
  ['intermediate', 'Intermediate', 'One to three years, comfortable with the main lifts'],
  ['advanced', 'Advanced', 'Three years or more of structured training'],
];
const ACTIVITY: [Activity, string, string][] = [
  ['desk', 'Mostly seated', 'Desk job, under 5,000 steps'],
  ['light', 'Lightly active', 'Some walking, 5,000 to 8,000 steps'],
  ['active', 'Active', 'On your feet most of the day'],
  ['very', 'Very active', 'Physical job or lots of sport'],
];

const STEPS = 8;

export default function Onboarding() {
  const complete = useStore((st) => st.completeOnboarding);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [target, setTarget] = useState('');
  const [goal, setGoal] = useState<Goal | null>(null);
  const [experience, setExperience] = useState<Level | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [days, setDays] = useState(4);
  const [mins, setMins] = useState(60);
  const [equipment, setEquipment] = useState<string[]>(ALL_EQUIPMENT);
  const [weighInDay, setWeighInDay] = useState(1);

  const n = (v: string) => parseFloat(v.replace(',', '.'));
  const inRange = (v: string, lo: number, hi: number) => n(v) >= lo && n(v) <= hi;

  const profile: Profile | null = useMemo(() => {
    if (!goal || !experience || !activity) return null;
    if (!inRange(age, 14, 90) || !inRange(height, 120, 230) || !inRange(weight, 35, 250)) return null;
    return {
      name: name.trim(), sex, age: Math.round(n(age)), heightCm: n(height), startWeightKg: n(weight),
      targetWeightKg: inRange(target, 35, 250) ? n(target) : n(weight),
      goal, experience, activity, daysPerWeek: days, sessionMins: mins, equipment, weighInDay,
    };
  }, [name, sex, age, height, weight, target, goal, experience, activity, days, mins, equipment, weighInDay]);

  const valid = [
    true,
    name.trim().length > 0,
    !!goal,
    inRange(age, 14, 90) && inRange(height, 120, 230) && inRange(weight, 35, 250),
    !!experience && !!activity,
    true,
    true,
    !!profile,
  ][step];

  const next = () => {
    if (step < STEPS - 1) return setStep(step + 1);
    if (profile) {
      complete(profile);
      router.replace('/');
    }
  };

  const preview = step === STEPS - 1 && profile ? { plan: generatePlan(profile), t: targets(profile, profile.startWeightKg) } : null;

  return (
    <Screen
      footer={
        <Button
          label={step === 0 ? 'Begin' : step === STEPS - 1 ? 'Start training' : 'Continue'}
          onPress={next}
          disabled={!valid}
        />
      }
    >
      {step > 0 ? (
        <>
          <Header onBack={() => setStep(step - 1)} title={`${step} of ${STEPS - 1}`} />
          <View style={st.progress}><View style={[st.progressFill, { width: `${(step / (STEPS - 1)) * 100}%` }]} /></View>
        </>
      ) : null}

      {step === 0 && (
        <View style={{ paddingTop: 96 }}>
          <Eyebrow>Private coaching</Eyebrow>
          <Text style={st.brand}>{APP_NAME}</Text>
          <View style={st.goldRule} />
          <Title style={{ marginTop: s.xl }}>Your trainer.{'\n'}Your kitchen.{'\n'}One plan.</Title>
          <Body muted style={{ marginTop: s.lg }}>
            A few questions and I'll build your training around the equipment you have, set your nutrition, and adjust both every week as you progress.
          </Body>
        </View>
      )}

      {step === 1 && (
        <>
          <Title>What should I call you?</Title>
          <Field value={name} onChangeText={setName} placeholder="First name" style={{ marginTop: s.xl }} autoFocus />
        </>
      )}

      {step === 2 && (
        <>
          <Title>What are we working towards{name ? `, ${name.trim()}` : ''}?</Title>
          <View style={{ marginTop: s.xl }}>
            {GOALS.map(([k, title, sub]) => <Option key={k} title={title} sub={sub} selected={goal === k} onPress={() => setGoal(k)} />)}
          </View>
        </>
      )}

      {step === 3 && (
        <>
          <Title>About you</Title>
          <Body muted style={{ marginTop: s.sm }}>Used to calculate your calories and macros.</Body>
          <ChipRow style={{ marginTop: s.xl }}>
            <Chip label="Male" selected={sex === 'male'} onPress={() => setSex('male')} />
            <Chip label="Female" selected={sex === 'female'} onPress={() => setSex('female')} />
          </ChipRow>
          <Row style={{ gap: s.md, marginTop: s.lg }}>
            <Field label="Age" value={age} onChangeText={setAge} numeric suffix="yrs" style={{ flex: 1 }} />
            <Field label="Height" value={height} onChangeText={setHeight} numeric suffix="cm" style={{ flex: 1 }} />
          </Row>
          <Row style={{ gap: s.md, marginTop: s.lg }}>
            <Field label="Weight" value={weight} onChangeText={setWeight} numeric suffix="kg" style={{ flex: 1 }} />
            <Field label="Goal weight" value={target} onChangeText={setTarget} numeric suffix="kg" placeholder="Optional" style={{ flex: 1 }} />
          </Row>
        </>
      )}

      {step === 4 && (
        <>
          <Title>Your experience</Title>
          <View style={{ marginTop: s.xl }}>
            {LEVELS.map(([k, title, sub]) => <Option key={k} title={title} sub={sub} selected={experience === k} onPress={() => setExperience(k)} />)}
          </View>
          <Eyebrow style={{ marginTop: s.lg, marginBottom: s.md }}>Outside the gym</Eyebrow>
          {ACTIVITY.map(([k, title, sub]) => <Option key={k} title={title} sub={sub} selected={activity === k} onPress={() => setActivity(k)} />)}
        </>
      )}

      {step === 5 && (
        <>
          <Title>Your schedule</Title>
          <Eyebrow style={{ marginTop: s.xl, marginBottom: s.md }}>Training days per week</Eyebrow>
          <Stepper value={days} onChange={setDays} min={2} max={6} suffix="days" />
          <Eyebrow style={{ marginTop: s.xl, marginBottom: s.md }}>Time per session</Eyebrow>
          <Stepper value={mins} onChange={setMins} min={30} max={90} step={15} suffix="min" />
          <Eyebrow style={{ marginTop: s.xl, marginBottom: s.md }}>Weekly weigh-in day</Eyebrow>
          <ChipRow>
            {DAYS.map((d, i) => <Chip key={d} label={d.slice(0, 3)} selected={weighInDay === i} onPress={() => setWeighInDay(i)} />)}
          </ChipRow>
        </>
      )}

      {step === 6 && (
        <>
          <Title>What equipment do you have?</Title>
          <Body muted style={{ marginTop: s.sm }}>Every exercise I programme will use only what you select. You can change this any time.</Body>
          <EquipmentPicker value={equipment} onChange={setEquipment} />
        </>
      )}

      {step === 7 && preview && (
        <>
          <Eyebrow>Your programme</Eyebrow>
          <Title style={{ marginTop: s.sm }}>Ready{name ? `, ${name.trim()}` : ''}.</Title>
          <Card gold style={{ marginTop: s.xl }}>
            <Eyebrow>Training</Eyebrow>
            <Text style={st.planName}>{preview.plan.split}</Text>
            <Small>{days} sessions a week · about {mins} minutes each</Small>
            <Rule />
            {preview.plan.days.map((d) => (
              <Row key={d.id} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
                <Body>{d.name}</Body>
                <Small>{d.exercises.length} exercises</Small>
              </Row>
            ))}
          </Card>
          <Card style={{ marginTop: s.md }}>
            <Eyebrow>Daily nutrition</Eyebrow>
            <Row style={{ marginTop: s.md }}>
              <Stat value={String(preview.t.kcal)} label="Calories" />
              <Stat value={String(preview.t.protein)} unit="g" label="Protein" />
              <Stat value={String(preview.t.carbs)} unit="g" label="Carbs" />
              <Stat value={String(preview.t.fat)} unit="g" label="Fat" />
            </Row>
          </Card>
          <Body muted style={{ marginTop: s.lg }}>
            Weights progress automatically from what you log. Each week I'll check in, review your weigh-ins and retune your calories.
          </Body>
          <Small style={{ marginTop: s.md }}>
            General fitness guidance, not medical advice. Check with your GP before starting if you have a health condition or injury.
          </Small>
        </>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  progress: { height: 2, backgroundColor: c.line, marginBottom: s.xl, borderRadius: 1 },
  progressFill: { height: 2, backgroundColor: c.gold, borderRadius: 1 },
  brand: { color: c.cream, fontFamily: f.serif, fontSize: 64, lineHeight: 70, letterSpacing: 1, marginTop: s.md },
  goldRule: { width: 48, height: 1, backgroundColor: c.gold, marginTop: s.lg },
  planName: { color: c.cream, fontFamily: f.serifSemi, fontSize: 24, marginTop: 6, marginBottom: 2 },
});
