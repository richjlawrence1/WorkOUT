import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { AREAS, Area, adjustSession } from '../lib/adjust';
import { EX } from '../lib/plan';
import { useStore } from '../store';
import { c, s } from '../theme';
import { Body, Button, Card, Chip, ChipRow, Eyebrow, Header, Row, Screen, Small, Title } from '../ui';

const TIMES: [number | null, string][] = [[null, 'Full session'], [45, '45 min'], [30, '30 min'], [20, '20 min']];

export default function Adjust() {
  const params = useLocalSearchParams<{ day?: string }>();
  const { plan, profile, sessions, nextDay, startWorkout } = useStore();
  const [areas, setAreas] = useState<Area[]>([]);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [lowEnergy, setLowEnergy] = useState(false);
  const idx = Number.isFinite(Number(params.day)) ? Number(params.day) : nextDay;
  const day = plan?.days[idx];

  const result = useMemo(
    () => (day && profile ? adjustSession(day, sessions, profile, { areas, minutes, lowEnergy }) : null),
    [day, profile, sessions, areas, minutes, lowEnergy]
  );
  if (!day || !profile || !result) return null;
  const changed = areas.length > 0 || minutes != null || lowEnergy;

  return (
    <Screen
      footer={
        <Button
          label={changed ? 'Start adjusted session' : 'Start session'}
          disabled={!result.entries.length}
          onPress={() => {
            startWorkout(idx, changed ? result.entries : undefined);
            router.replace('/workout');
          }}
        />
      }
    >
      <Header title="Adjust today" />
      <Title>How are you today?</Title>
      <Body muted style={{ marginTop: s.sm }}>Tell me what's going on and I'll rebuild {day.name} around it. Your normal programme is untouched.</Body>

      <Eyebrow style={{ marginTop: s.xl, marginBottom: s.md }}>Anything sore or injured?</Eyebrow>
      <ChipRow>
        {AREAS.map(([k, label]) => {
          const on = areas.includes(k);
          return <Chip key={k} label={label} selected={on} onPress={() => setAreas(on ? areas.filter((x) => x !== k) : [...areas, k])} />;
        })}
      </ChipRow>

      <Eyebrow style={{ marginTop: s.xl, marginBottom: s.md }}>Time available</Eyebrow>
      <ChipRow>{TIMES.map(([m, label]) => <Chip key={label} label={label} selected={minutes === m} onPress={() => setMinutes(m)} />)}</ChipRow>

      <Eyebrow style={{ marginTop: s.xl, marginBottom: s.md }}>Energy</Eyebrow>
      <ChipRow>
        <Chip label="Normal" selected={!lowEnergy} onPress={() => setLowEnergy(false)} />
        <Chip label="Run down or slept badly" selected={lowEnergy} onPress={() => setLowEnergy(true)} />
      </ChipRow>

      {result.changes.length ? (
        <Card gold style={{ marginTop: s.xl }}>
          <Eyebrow>What I changed</Eyebrow>
          {result.changes.map((x, i) => <Body key={i} style={{ marginTop: s.sm, fontSize: 14, lineHeight: 20 }}>{x}</Body>)}
        </Card>
      ) : null}

      <Card style={{ marginTop: s.md }}>
        <Eyebrow>Today's session</Eyebrow>
        {result.entries.map((e, i) => (
          <Row key={i} style={{ justifyContent: 'space-between', paddingTop: s.md }}>
            <Body style={{ flex: 1 }} numberOfLines={1}>{EX[e.exId]?.name}</Body>
            <Small>{e.sets.length} × {e.repMin}-{e.repMax}{e.sets[0]?.kg ? ` · ${e.sets[0].kg} kg` : ''}</Small>
          </Row>
        ))}
        {!result.entries.length ? <Body muted style={{ marginTop: s.sm }}>Nothing safe is left with your equipment. Rest today, or pick a different session.</Body> : null}
      </Card>
      {areas.length ? (
        <View style={{ marginTop: s.md }}>
          <Small style={{ color: c.muted }}>This avoids movements that usually load the area. It isn't a diagnosis. Sharp pain, swelling or pain that lasts more than a few days needs a physio or GP.</Small>
        </View>
      ) : null}
    </Screen>
  );
}
