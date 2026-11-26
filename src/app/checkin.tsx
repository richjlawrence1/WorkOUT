import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PhotoCapture, PhotoCompare } from '../components/ProgressPhotos';
import { WeighInCard } from '../components/WeighInCard';
import { buildCheckIn } from '../lib/checkin';
import { dayKey } from '../lib/dates';
import { weeklyInsights } from '../lib/insights';
import { mobilityTarget } from '../lib/mobility';
import { todayIndex } from '../lib/mealplan';
import { deltaParts } from '../lib/units';
import { InsightCard } from '../components/InsightCard';
import { selectTargets, useStore } from '../store';
import { c, f, s } from '../theme';
import type { CheckIn } from '../types';
import { Body, Button, Card, Eyebrow, Field, Header, Row, Rule, Screen, Small, Stat, Title, tap, thud } from '../ui';

const QUESTIONS: [keyof Pick<CheckIn, 'energy' | 'sleep' | 'hunger' | 'adherence'>, string, string, string][] = [
  ['energy', 'How was your energy?', 'Drained', 'Flying'],
  ['sleep', 'How did you sleep?', 'Badly', 'Deeply'],
  ['hunger', 'How hungry were you?', 'Never', 'Constantly'],
  ['adherence', 'How closely did you follow the plan?', 'Barely', 'To the letter'],
];

export default function CheckInScreen() {
  const st0 = useStore();
  const { profile, weights, sessions, diary, addCheckIn } = st0;
  const [a, setA] = useState({ energy: 3, sleep: 3, hunger: 3, adherence: 3 });
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<CheckIn | null>(null);
  if (!profile) return null;
  const weighedToday = weights.some((w) => w.date === dayKey());
  const hasPhotos = st0.photos.length > 0;

  if (result) {
    const t = selectTargets(st0)!;
    return (
      <Screen footer={<Button label="Done" onPress={() => router.back()} />}>
        <View style={{ paddingTop: s.xl }}>
          <Eyebrow>Your week in review</Eyebrow>
          <Title style={{ marginTop: s.sm }}>{result.verdict}</Title>
        </View>
        <Card style={{ marginTop: s.xl }}>
          <Row>
            <Stat value={`${result.workoutsDone}/${result.workoutsPlanned}`} label="Sessions" />
            <Stat
              value={result.weightChange == null ? '–' : deltaParts(result.weightChange, profile.units).value}
              unit={result.weightChange == null ? undefined : deltaParts(result.weightChange, profile.units).unit}
              label="Weight change"
            />
            <Stat value={result.avgKcal == null ? '–' : String(result.avgKcal)} label="Avg kcal" />
          </Row>
        </Card>
        {weeklyInsights({ profile, targets: t, sessions, diary, weights: st0.weights, todayMeals: st0.mealPlan?.days[todayIndex()] ?? [] }).map((i) => (
          <InsightCard key={i.id} insight={i} style={{ marginTop: s.md }} />
        ))}
        {result.changes?.length ? (
          <Card gold style={{ marginTop: s.md }}>
            <Eyebrow>What I'm changing</Eyebrow>
            {result.changes.map((ch, i) => (
              <View key={ch.label}>
                {i ? <Rule style={{ marginVertical: s.md }} /> : <View style={{ height: s.md }} />}
                <Row style={{ justifyContent: 'space-between' }}>
                  <Body style={{ fontFamily: f.semi }}>{ch.label}</Body>
                  <Body><Body muted>{ch.from}  →  </Body><Body style={{ color: c.gold, fontFamily: f.semi }}>{ch.to}</Body></Body>
                </Row>
                <Small style={{ marginTop: 4, color: c.text }}>{ch.why}</Small>
              </View>
            ))}
          </Card>
        ) : null}
        <Card style={{ marginTop: s.md }}>
          <Eyebrow>Notes for the week ahead</Eyebrow>
          {result.actions.map((x, i) => (
            <View key={i}>
              {i ? <Rule style={{ marginVertical: s.md }} /> : <View style={{ height: s.md }} />}
              <Body>{x}</Body>
            </View>
          ))}
        </Card>
        {hasPhotos ? (
          <Card style={{ marginTop: s.md }}>
            <Eyebrow style={{ marginBottom: s.md }}>Start vs now</Eyebrow>
            <PhotoCompare />
          </Card>
        ) : null}
        <Card style={{ marginTop: s.md }}>
          <Eyebrow>Cardio and steps</Eyebrow>
          <Row style={{ marginTop: s.md }}>
            <Stat value={String(st0.cardioMins)} unit="min" label="After each session" />
            <Stat value={st0.stepTarget.toLocaleString()} label="Steps a day" />
          </Row>
        </Card>
        <Card style={{ marginTop: s.md }}>
          <Eyebrow>Daily targets{result.kcalDelta ? ' · updated' : ''}</Eyebrow>
          <Row style={{ marginTop: s.md }}>
            <Stat value={String(t.kcal)} label="Calories" />
            <Stat value={String(t.protein)} unit="g" label="Protein" />
            <Stat value={String(t.carbs)} unit="g" label="Carbs" />
            <Stat value={String(t.fat)} unit="g" label="Fat" />
          </Row>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button
          label="Review my week"
          onPress={() => {
            const now = useStore.getState();
            const ci = buildCheckIn(profile, now.weights, sessions, diary, { ...a, notes: notes.trim() }, {
              cardioMins: now.cardioMins, stepTarget: now.stepTarget, steps: now.steps, cardioLog: now.cardioLog,
              phase: now.phase, phaseWeeks: now.phaseWeeks, kcalTarget: selectTargets(now)!.kcal,
              mobilityTarget: mobilityTarget(profile),
              mobilityDone: now.mobilityLog.filter((x) => x.kind === 'session' && Date.now() - new Date(x.date).getTime() < 7 * 864e5).length,
            });
            addCheckIn(ci);
            if (ci.kcalDelta && useStore.getState().mealPlan) useStore.getState().buildMealPlan();
            thud();
            setResult(ci);
          }}
        />
      }
    >
      <Header title="Check-in" />
      <Title>Weekly check-in</Title>
      <Body muted style={{ marginTop: s.sm }}>Honest answers give you a better plan.</Body>

      {!weighedToday ? <WeighInCard style={{ marginTop: s.xl }} title="Today's weight" /> : (
        <Small style={{ marginTop: s.lg, color: c.gold }}>Today's weight logged.</Small>
      )}

      {QUESTIONS.map(([key, q, lo, hi]) => (
        <View key={key} style={{ marginTop: s.xl }}>
          <Body style={{ fontFamily: f.medium }}>{q}</Body>
          <Row style={{ gap: s.sm, marginTop: s.md }}>
            {[1, 2, 3, 4, 5].map((v) => (
              <Pressable
                key={v}
                accessibilityRole="radio"
                accessibilityLabel={`${q} ${v} of 5`}
                accessibilityState={{ selected: a[key] === v }}
                onPress={() => { tap(); setA({ ...a, [key]: v }); }}
                style={[st.scale, a[key] === v && st.scaleOn]}
              >
                <Text style={[st.scaleText, a[key] === v && { color: c.goldBright }]}>{v}</Text>
              </Pressable>
            ))}
          </Row>
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <Small>{lo}</Small>
            <Small>{hi}</Small>
          </Row>
        </View>
      ))}

      <Card style={{ marginTop: s.xl }}>
        <Eyebrow>Progress photos</Eyebrow>
        <Body muted style={{ marginTop: 4, marginBottom: s.md }}>
          Front, side and back. Same spot, same light and same time of day each week makes the comparison honest.
        </Body>
        <PhotoCapture />
      </Card>
      {hasPhotos ? (
        <Card style={{ marginTop: s.md }}>
          <Eyebrow style={{ marginBottom: s.md }}>Start vs now</Eyebrow>
          <PhotoCompare />
        </Card>
      ) : null}

      <Field label="Anything else? (optional)" value={notes} onChangeText={setNotes} placeholder="Niggles, wins, a busy week ahead" style={{ marginTop: s.xl }} />
    </Screen>
  );
}

const st = StyleSheet.create({
  scale: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  scaleOn: { borderColor: c.gold, backgroundColor: c.goldWash },
  scaleText: { color: c.muted, fontFamily: f.serif, fontSize: 18 },
});
