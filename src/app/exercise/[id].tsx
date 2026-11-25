import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { ExerciseDemo } from '../../components/ExerciseDemo';
import { shortDate } from '../../lib/dates';
import { EQUIPMENT, EX, muscleLabel } from '../../lib/plan';
import { bestE1rm, e1rm } from '../../lib/progression';
import { useStore } from '../../store';
import { c, f, s } from '../../theme';
import { Body, Card, Chip, ChipRow, Eyebrow, Header, Row, Screen, Small, Stat, Title } from '../../ui';

const EQ_LABEL: Record<string, string> = Object.fromEntries(EQUIPMENT.flatMap((g) => g.items));

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessions = useStore((st) => st.sessions);
  const ex = EX[id];
  if (!ex) return <Screen><Header title="Exercise" /><Body>Exercise not found.</Body></Screen>;

  const history = sessions
    .map((sn) => {
      const e = sn.entries.find((x) => x.exId === ex.id);
      const sets = e?.sets.filter((x) => x.done && x.reps) ?? [];
      if (!sets.length) return null;
      const top = sets.reduce((a, b) => (e1rm(b.kg ?? 0, b.reps ?? 0) > e1rm(a.kg ?? 0, a.reps ?? 0) ? b : a));
      return { date: new Date(sn.date), sets, best: e1rm(top.kg ?? 0, top.reps ?? 0) };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
  const best = bestE1rm(sessions, ex.id);

  return (
    <Screen>
      <Header title="Technique" />
      <ExerciseDemo id={ex.id} />
      <Eyebrow style={{ marginTop: s.xl }}>{ex.compound ? 'Compound' : 'Isolation'} · {ex.level}</Eyebrow>
      <Title style={{ marginTop: 4 }}>{ex.name}</Title>

      <ChipRow style={{ marginTop: s.lg }}>
        {ex.primary.map((m) => <Chip key={m} label={muscleLabel(m)} selected />)}
        {ex.secondary.map((m) => <Chip key={m} label={muscleLabel(m)} />)}
      </ChipRow>
      <Small style={{ marginTop: s.md }}>
        {ex.equipment.length ? `Needs: ${ex.equipment.map((q) => EQ_LABEL[q] ?? q).join(', ')}` : 'No equipment needed'}
      </Small>

      {history.length ? (
        <Card style={{ marginTop: s.xl }}>
          <Eyebrow>Your progress</Eyebrow>
          <Row style={{ marginTop: s.md }}>
            <Stat value={String(history.length)} label="Sessions" />
            {best > 0 ? <Stat value={best.toFixed(1)} unit="kg" label="Best est. 1RM" /> : null}
          </Row>
          {history.length > 1 && best > 0 ? <Spark values={history.map((h) => h.best)} /> : null}
          {history.slice(-4).reverse().map((h, i) => (
            <Row key={i} style={{ justifyContent: 'space-between', paddingTop: s.md }}>
              <Small>{shortDate(h.date)}</Small>
              <Small style={{ color: c.text }}>{h.sets.map((x) => (x.kg ? `${x.kg}×${x.reps}` : x.reps)).join('  ')}</Small>
            </Row>
          ))}
        </Card>
      ) : null}

      <Eyebrow style={{ marginTop: s.xl, marginBottom: s.md }}>How to do it</Eyebrow>
      {ex.instructions.map((line, i) => (
        <Row key={i} style={{ alignItems: 'flex-start', marginBottom: s.lg }}>
          <Text style={st.num}>{i + 1}</Text>
          <Body style={{ flex: 1 }}>{line}</Body>
        </Row>
      ))}
    </Screen>
  );
}

function Spark({ values }: { values: number[] }) {
  const w = 300, h = 70, pad = 6;
  const lo = Math.min(...values), hi = Math.max(...values);
  const pts = values.map((v, i) => [pad + (i * (w - pad * 2)) / (values.length - 1), h - pad - ((v - lo) / (hi - lo || 1)) * (h - pad * 2)]);
  const last = pts[pts.length - 1];
  return (
    <View style={{ marginTop: s.md }}>
      <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <Polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={c.gold} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={last[0]} cy={last[1]} r={3.5} fill={c.goldBright} />
      </Svg>
    </View>
  );
}

const st = StyleSheet.create({
  num: { width: 30, color: c.gold, fontFamily: f.serif, fontSize: 18, lineHeight: 22 },
});
