import { router } from 'expo-router';
import React, { useState } from 'react';
import { EquipmentPicker } from '../components/EquipmentPicker';
import { DAYS } from '../lib/dates';
import { selectTargets, useStore } from '../store';
import { c, s } from '../theme';
import type { Goal } from '../types';
import { Body, Button, Card, Chip, ChipRow, Eyebrow, Header, Row, Screen, Small, Stat, Stepper, Title } from '../ui';

const GOALS: [Goal, string][] = [['lose', 'Lose fat'], ['build', 'Build muscle'], ['recomp', 'Tone & recomp'], ['strength', 'Get stronger']];

// Screens here are always pushed over the tabs, so going back returns to them.
const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

export default function Settings() {
  const st0 = useStore();
  const { profile, updateProfile, reset } = st0;
  const [equipment, setEquipment] = useState(profile?.equipment ?? []);
  const [days, setDays] = useState(profile?.daysPerWeek ?? 4);
  const [mins, setMins] = useState(profile?.sessionMins ?? 60);
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? 'recomp');
  const [weighInDay, setWeighInDay] = useState(profile?.weighInDay ?? 1);
  const [confirmReset, setConfirmReset] = useState(false);
  if (!profile) return null;

  const t = selectTargets({ ...st0, profile: { ...profile, goal, daysPerWeek: days } })!;
  const planChanged =
    days !== profile.daysPerWeek || mins !== profile.sessionMins || goal !== profile.goal ||
    equipment.length !== profile.equipment.length || equipment.some((x) => !profile.equipment.includes(x));
  const dirty = planChanged || weighInDay !== profile.weighInDay;

  return (
    <Screen
      footer={
        <Button
          label={planChanged ? 'Save & rebuild programme' : 'Save'}
          disabled={!dirty}
          onPress={() => {
            updateProfile({ equipment, daysPerWeek: days, sessionMins: mins, goal, weighInDay }, planChanged);
            router.back();
          }}
        />
      }
    >
      <Header title="Settings" />
      <Title>Your set-up</Title>
      <Small style={{ marginTop: 6 }}>Changing your goal, schedule or equipment rebuilds your programme. Your logged history is kept.</Small>

      <Eyebrow style={{ marginTop: s.xl, marginBottom: s.md }}>Goal</Eyebrow>
      <ChipRow>{GOALS.map(([k, label]) => <Chip key={k} label={label} selected={goal === k} onPress={() => setGoal(k)} />)}</ChipRow>
      <Card style={{ marginTop: s.md }}>
        <Row>
          <Stat value={String(t.kcal)} label="Calories" />
          <Stat value={String(t.protein)} unit="g" label="Protein" />
          <Stat value={String(t.carbs)} unit="g" label="Carbs" />
          <Stat value={String(t.fat)} unit="g" label="Fat" />
        </Row>
      </Card>

      <Eyebrow style={{ marginTop: s.xl, marginBottom: s.md }}>Training days per week</Eyebrow>
      <Stepper value={days} onChange={setDays} min={2} max={6} suffix="days" />
      <Eyebrow style={{ marginTop: s.xl, marginBottom: s.md }}>Time per session</Eyebrow>
      <Stepper value={mins} onChange={setMins} min={30} max={90} step={15} suffix="min" />

      <Eyebrow style={{ marginTop: s.xl, marginBottom: s.md }}>Weekly weigh-in day</Eyebrow>
      <ChipRow>{DAYS.map((d, i) => <Chip key={d} label={d.slice(0, 3)} selected={weighInDay === i} onPress={() => setWeighInDay(i)} />)}</ChipRow>

      <Title style={{ fontSize: 28, marginTop: s.xxl }}>Equipment</Title>
      <EquipmentPicker value={equipment} onChange={setEquipment} />

      <Card style={{ marginTop: s.xxl }}>
        <Eyebrow style={{ color: c.bad }}>Start over</Eyebrow>
        <Body muted style={{ marginVertical: s.sm }}>Erases your profile, programme, training history, weigh-ins and food diary from this device. This cannot be undone.</Body>
        {confirmReset ? (
          <Row style={{ gap: s.md }}>
            <Button label="Cancel" small variant="ghost" onPress={() => setConfirmReset(false)} />
            <Button label="Erase everything" small variant="quiet" onPress={() => { reset(); leave(); }} />
          </Row>
        ) : (
          <Button label="Erase all data" small variant="quiet" style={{ alignSelf: 'flex-start' }} onPress={() => setConfirmReset(true)} />
        )}
      </Card>
    </Screen>
  );
}
