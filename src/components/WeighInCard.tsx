import React, { useState } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { fmtBody, toKg } from '../lib/units';
import { selectWeight, useStore } from '../store';
import { s } from '../theme';
import { Body, Button, Card, Eyebrow, Field, Row, thud } from '../ui';

const num = (v: string) => parseFloat(v.replace(',', '.'));

export function WeighInCard({ style, title = 'Weigh-in' }: { style?: StyleProp<ViewStyle>; title?: string }) {
  const last = useStore(selectWeight);
  const units = useStore((st) => st.profile?.units ?? 'kg');
  const logWeight = useStore((st) => st.logWeight);
  const [value, setValue] = useState('');
  const [extra, setExtra] = useState('');
  const kg = toKg(num(value), units, num(extra) || 0);
  const valid = kg >= 35 && kg <= 250;
  return (
    <Card style={style}>
      <Eyebrow>{title}</Eyebrow>
      <Body muted style={{ marginTop: 4, marginBottom: s.md }}>
        First thing in the morning, before eating, gives the most consistent reading. Last: {fmtBody(last, units)}.
      </Body>
      <Row style={{ gap: s.md }}>
        <Field value={value} onChangeText={setValue} numeric suffix={units === 'st' ? 'st' : units} placeholder={units === 'kg' ? last.toFixed(1) : ''} style={{ flex: 1 }} />
        {units === 'st' ? <Field value={extra} onChangeText={setExtra} numeric suffix="lb" style={{ flex: 1 }} /> : null}
        <Button label="Save" small disabled={!valid} onPress={() => { logWeight(Math.round(kg * 10) / 10); setValue(''); setExtra(''); thud(); }} />
      </Row>
    </Card>
  );
}
