import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { EquipmentPicker } from '../components/EquipmentPicker';
import { getApiKey, setApiKey } from '../lib/coachChat';
import { AREAS, type Area } from '../lib/injuries';
import { DAYS } from '../lib/dates';
import { DEFAULT_REMINDERS, ReminderPrefs, ensurePermission, syncReminders } from '../lib/notify';
import { SUPERMARKETS } from '../lib/prices';
import { UNIT_OPTIONS, Units } from '../lib/units';
import { selectTargets, useStore } from '../store';
import { c, s } from '../theme';
import type { Goal } from '../types';
import { Body, Button, Card, Chip, ChipRow, Eyebrow, Field, Header, Option, Row, Screen, Small, Stat, Stepper, Title } from '../ui';

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
  const [units, setUnits] = useState<Units>(profile?.units ?? 'kg');
  const [age, setAge] = useState(String(profile?.age ?? ''));
  const [injuries, setInjuries] = useState<Area[]>(profile?.injuries ?? []);
  const [key, setKey] = useState('');
  const [keySaved, setKeySaved] = useState<boolean | null>(null);
  const [notifMsg, setNotifMsg] = useState<string | null>(null);
  const reminders = { ...DEFAULT_REMINDERS, ...st0.reminders };
  useEffect(() => { getApiKey().then((k) => setKeySaved(!!k)).catch(() => setKeySaved(false)); }, []);

  // Reminders apply immediately rather than waiting for Save.
  const toggleReminder = async (k: keyof ReminderPrefs) => {
    setNotifMsg(null);
    const next = { ...reminders, [k]: !reminders[k] };
    if (next[k] && !(await ensurePermission())) {
      return setNotifMsg(Platform.OS === 'web' ? 'Reminders work on your phone, not in the browser.' : 'Notifications are turned off for this app. Enable them in your phone\'s Settings.');
    }
    st0.setReminders(next);
    syncReminders(next, weighInDay, st0.plan?.days[st0.nextDay]?.name);
  };
  if (!profile) return null;

  const ageNum = Math.round(parseFloat(age));
  const ageOk = ageNum >= 14 && ageNum <= 90;
  const t = selectTargets({ ...st0, profile: { ...profile, goal, daysPerWeek: days } })!;
  const planChanged =
    days !== profile.daysPerWeek || mins !== profile.sessionMins || goal !== profile.goal ||
    equipment.length !== profile.equipment.length || equipment.some((x) => !profile.equipment.includes(x)) ||
    (ageOk && ageNum !== profile.age) || injuries.length !== (profile.injuries ?? []).length || injuries.some((x) => !(profile.injuries ?? []).includes(x));
  const dirty = planChanged || weighInDay !== profile.weighInDay || units !== (profile.units ?? 'kg');

  return (
    <Screen
      footer={
        <Button
          label={planChanged ? 'Save & rebuild programme' : 'Save'}
          disabled={!dirty}
          onPress={() => {
            updateProfile({ equipment, daysPerWeek: days, sessionMins: mins, goal, weighInDay, units, injuries, ...(ageOk ? { age: ageNum } : {}) }, planChanged);
            syncReminders(reminders, weighInDay, st0.plan?.days[st0.nextDay]?.name);
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

      <Eyebrow style={{ marginTop: s.xl, marginBottom: s.md }}>Age</Eyebrow>
      <Field value={age} onChangeText={setAge} numeric suffix="yrs" />
      <Small style={{ marginTop: s.sm }}>Sets how much mobility work is in your week and how heavy the low-rep work goes.</Small>

      <Eyebrow style={{ marginTop: s.xl, marginBottom: s.md }}>Injuries and problem areas</Eyebrow>
      <ChipRow>
        <Chip label="None" selected={!injuries.length} onPress={() => setInjuries([])} />
        {AREAS.map(([k, label]) => {
          const on = injuries.includes(k);
          return <Chip key={k} label={label} selected={on} onPress={() => setInjuries(on ? injuries.filter((x) => x !== k) : [...injuries, k])} />;
        })}
      </ChipRow>
      <Small style={{ marginTop: s.sm }}>Exercises that load these are kept out of your programme.</Small>

      <Eyebrow style={{ marginTop: s.xl, marginBottom: s.md }}>Training days per week</Eyebrow>
      <Stepper value={days} onChange={setDays} min={2} max={6} suffix="days" />
      <Eyebrow style={{ marginTop: s.xl, marginBottom: s.md }}>Time per session</Eyebrow>
      <Stepper value={mins} onChange={setMins} min={30} max={90} step={15} suffix="min" />

      <Eyebrow style={{ marginTop: s.xl, marginBottom: s.md }}>Weekly weigh-in day</Eyebrow>
      <ChipRow>{DAYS.map((d, i) => <Chip key={d} label={d.slice(0, 3)} selected={weighInDay === i} onPress={() => setWeighInDay(i)} />)}</ChipRow>

      <Eyebrow style={{ marginTop: s.xl, marginBottom: s.md }}>Body weight units</Eyebrow>
      <ChipRow>{UNIT_OPTIONS.map(([k, label]) => <Chip key={k} label={label} selected={units === k} onPress={() => setUnits(k)} />)}</ChipRow>
      <Small style={{ marginTop: s.sm }}>Lifting weights are always shown in kg.</Small>

      <Title style={{ fontSize: 26, marginTop: s.xxl, marginBottom: s.lg }}>Reminders</Title>
      <Option title="Weigh-in" sub={`${DAYS[weighInDay]}s at 7:30am`} selected={reminders.weighIn} onPress={() => toggleReminder('weighIn')} />
      <Option title="Weekly check-in" sub={`${DAYS[weighInDay]}s at 6:30pm`} selected={reminders.checkIn} onPress={() => toggleReminder('checkIn')} />
      <Option title="Log your food" sub="Every day at 8pm" selected={reminders.food} onPress={() => toggleReminder('food')} />
      <Option title="Training nudge" sub="Every day at 5pm" selected={reminders.training} onPress={() => toggleReminder('training')} />
      <Option title="Rest timer alert" sub="Buzzes your lock screen and watch when rest is over" selected={reminders.rest} onPress={() => toggleReminder('rest')} />
      {notifMsg ? <Small style={{ color: c.bad }}>{notifMsg}</Small> : null}

      <Title style={{ fontSize: 26, marginTop: s.xxl }}>Coach chat</Title>
      <Small style={{ marginTop: 6, marginBottom: s.md }}>
        {keySaved ? 'An API key is saved on this phone. Paste a new one to replace it.' : 'Paste your Anthropic API key (starts with sk-ant-) to chat with your coach. It is stored only in this phone\'s secure keychain.'}
      </Small>
      <Row style={{ gap: s.md }}>
        <Field value={key} onChangeText={setKey} placeholder={keySaved ? 'Key saved' : 'sk-ant-...'} style={{ flex: 1 }} />
        <Button label="Save" small disabled={key.trim().length < 20} onPress={async () => { await setApiKey(key); setKey(''); setKeySaved(true); }} />
      </Row>
      {keySaved ? <Button label="Remove key" small variant="quiet" style={{ alignSelf: 'flex-start' }} onPress={async () => { await setApiKey(''); setKeySaved(false); }} /> : null}

      <Title style={{ fontSize: 26, marginTop: s.xxl, marginBottom: s.md }}>Your supermarket</Title>
      <ChipRow>{SUPERMARKETS.map(([k, label]) => <Chip key={k || 'any'} label={label} selected={st0.supermarket === k} onPress={() => st0.setSupermarket(k)} />)}</ChipRow>
      <Small style={{ marginTop: s.sm }}>Food search shows this shop's products first.</Small>

      <Title style={{ fontSize: 26, marginTop: s.xxl }}>Equipment</Title>
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
