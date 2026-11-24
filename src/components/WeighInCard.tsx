import React, { useState } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { selectWeight, useStore } from '../store';
import { s } from '../theme';
import { Body, Button, Card, Eyebrow, Field, Row, thud } from '../ui';

export function WeighInCard({ style, title = 'Weigh-in' }: { style?: StyleProp<ViewStyle>; title?: string }) {
  const last = useStore(selectWeight);
  const logWeight = useStore((st) => st.logWeight);
  const [value, setValue] = useState('');
  const kg = parseFloat(value.replace(',', '.'));
  const valid = kg >= 35 && kg <= 250;
  return (
    <Card style={style}>
      <Eyebrow>{title}</Eyebrow>
      <Body muted style={{ marginTop: 4, marginBottom: s.md }}>
        First thing in the morning, before eating, gives the most consistent reading.
      </Body>
      <Row style={{ gap: s.md }}>
        <Field value={value} onChangeText={setValue} numeric suffix="kg" placeholder={last.toFixed(1)} style={{ flex: 1 }} />
        <Button label="Save" small disabled={!valid} onPress={() => { logWeight(Math.round(kg * 10) / 10); setValue(''); thud(); }} />
      </Row>
    </Card>
  );
}
