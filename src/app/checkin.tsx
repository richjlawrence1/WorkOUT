import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WeighInCard } from '../components/WeighInCard';
import { buildCheckIn } from '../lib/checkin';
import { dayKey } from '../lib/dates';
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
              value={result.weightChange == null ? '–' : `${result.weightChange > 0 ? '+' : ''}${result.weightChange}`}
              unit={result.weightChange == null ? undefined : 'kg'}
              label="Weight change"
            />
            <Stat value={result.avgKcal == null ? '–' : String(result.avgKcal)} label="Avg kcal" />
          </Row>
        </Card>
        <Card gold style={{ marginTop: s.md }}>
          <Eyebrow>Plan for the week ahead</Eyebrow>
          {result.actions.map((x, i) => (
            <View key={i}>
              {i ? <Rule style={{ marginVertical: s.md }} /> : <View style={{ height: s.md }} />}
              <Body>{x}</Body>
            </View>
          ))}
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
            const ci = buildCheckIn(profile, useStore.getState().weights, sessions, diary, { ...a, notes: notes.trim() });
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

      <Field label="Anything else? (optional)" value={notes} onChangeText={setNotes} placeholder="Niggles, wins, a busy week ahead" style={{ marginTop: s.xl }} />
    </Screen>
  );
}

const st = StyleSheet.create({
  scale: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  scaleOn: { borderColor: c.gold, backgroundColor: c.goldWash },
  scaleText: { color: c.muted, fontFamily: f.serif, fontSize: 22, fontVariant: ['lining-nums'] },
});
