import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ExerciseDemo } from '../components/ExerciseDemo';
import { drillSeconds, mobilitySession, routineMinutes } from '../lib/mobility';
import { useStore } from '../store';
import { c, f, s } from '../theme';
import { Body, Button, Card, Chip, ChipRow, Eyebrow, Header, Row, Screen, Small, Title, thud } from '../ui';

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

export default function Mobility() {
  const logMobility = useStore((x) => x.logMobility);
  const [short, setShort] = useState(false);
  const drills = useMemo(() => mobilitySession(short), [short]);
  const [idx, setIdx] = useState(-1); // -1 = overview
  const [left, setLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const drill = drills[idx];

  useEffect(() => {
    if (!running || left <= 0) return;
    const t = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [running, left]);
  useEffect(() => {
    if (running && left === 0 && drill) {
      thud();
      setRunning(false);
    }
  }, [running, left, drill]);

  const go = (i: number) => {
    if (i >= drills.length) {
      logMobility(routineMinutes(drills), 'session');
      thud();
      return setFinished(true);
    }
    setIdx(i);
    setLeft(drillSeconds(drills[i]));
    setRunning(true);
  };

  if (finished) {
    return (
      <Screen footer={<Button label="Done" onPress={() => router.back()} />}>
        <View style={{ paddingTop: s.xxl }}>
          <Eyebrow>Mobility complete</Eyebrow>
          <Title style={{ marginTop: s.sm }}>{routineMinutes(drills)} minutes banked.</Title>
          <Body muted style={{ marginTop: s.md }}>This counts towards your weekly mobility target. Tomorrow's lifting will feel better for it.</Body>
        </View>
      </Screen>
    );
  }

  if (!drill) {
    return (
      <Screen footer={<Button label="Start" onPress={() => go(0)} />}>
        <Header title="Mobility" />
        <Title>Full-body mobility</Title>
        <Body muted style={{ marginTop: s.sm }}>Moves first to loosen up, then longer holds. No equipment needed. Breathe slowly and never push into pain.</Body>
        <ChipRow style={{ marginTop: s.lg }}>
          <Chip label={`Full · ${routineMinutes(mobilitySession(false))} min`} selected={!short} onPress={() => setShort(false)} />
          <Chip label={`Short · ${routineMinutes(mobilitySession(true))} min`} selected={short} onPress={() => setShort(true)} />
        </ChipRow>
        <Card style={{ marginTop: s.lg, paddingVertical: 4 }}>
          {drills.map((d, i) => (
            <Row key={d.id} style={[{ paddingVertical: 10 }, i > 0 && st.line]}>
              <ExerciseDemo id={d.id} animate={false} style={st.thumb} />
              <View style={{ flex: 1 }}>
                <Body numberOfLines={1}>{d.name}</Body>
                <Small>{d.seconds} sec{d.sides ? ' each side' : ''}</Small>
              </View>
            </Row>
          ))}
        </Card>
      </Screen>
    );
  }

  const side = drill.sides ? (left > drill.seconds ? 'First side' : 'Second side') : null;
  return (
    <Screen
      footer={
        <Row style={{ gap: s.md }}>
          <Button label={running ? 'Pause' : left > 0 ? 'Resume' : 'Again'} variant="ghost" style={{ flex: 1 }} onPress={() => (left > 0 ? setRunning(!running) : go(idx))} />
          <Button label={idx === drills.length - 1 ? 'Finish' : 'Next'} style={{ flex: 1 }} onPress={() => go(idx + 1)} />
        </Row>
      }
    >
      <Header title={`${idx + 1} of ${drills.length}`} onBack={() => (idx > 0 ? go(idx - 1) : setIdx(-1))} />
      <ExerciseDemo id={drill.id} />
      <Eyebrow style={{ marginTop: s.xl }}>{drill.dynamic ? 'Move' : 'Hold'}{side ? ` · ${side}` : ''}</Eyebrow>
      <Title style={{ marginTop: 4 }}>{drill.name}</Title>
      <Text style={st.clock}>{clock(drill.sides && left > drill.seconds ? left - drill.seconds : left)}</Text>
      {drill.instructions.slice(0, 3).map((line, i) => <Body key={i} muted style={{ marginTop: s.sm, fontSize: 14, lineHeight: 20 }}>{line}</Body>)}
    </Screen>
  );
}

const st = StyleSheet.create({
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
  thumb: { width: 52, aspectRatio: 1, borderRadius: 10, marginRight: s.md },
  clock: { color: c.gold, fontFamily: f.heavy, fontSize: 64, lineHeight: 70, letterSpacing: -2, marginTop: s.md, fontVariant: ['tabular-nums'] },
});
