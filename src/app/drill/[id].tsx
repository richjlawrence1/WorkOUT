import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { ExerciseDemo } from '../../components/ExerciseDemo';
import { DRILL } from '../../lib/mobility';
import { c, f, s } from '../../theme';
import { Body, Eyebrow, Header, Row, Screen, Title } from '../../ui';

export default function DrillDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = DRILL[id];
  if (!d) return <Screen><Header title="Stretch" /><Body>Not found.</Body></Screen>;
  return (
    <Screen>
      <Header title="Technique" />
      <ExerciseDemo id={d.id} />
      <Eyebrow style={{ marginTop: s.xl }}>{d.dynamic ? 'Mobility drill' : 'Stretch'} · {d.seconds} sec{d.sides ? ' each side' : ''}</Eyebrow>
      <Title style={{ marginTop: 4, marginBottom: s.lg }}>{d.name}</Title>
      {d.instructions.map((line, i) => (
        <Row key={i} style={{ alignItems: 'flex-start', marginBottom: s.lg }}>
          <Text style={st.num}>{i + 1}</Text>
          <Body style={{ flex: 1 }}>{line}</Body>
        </Row>
      ))}
    </Screen>
  );
}

const st = StyleSheet.create({ num: { width: 30, color: c.gold, fontFamily: f.serif, fontSize: 18, lineHeight: 22 } });
