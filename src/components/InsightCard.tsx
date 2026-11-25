import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import type { Insight } from '../lib/insights';
import { c, f, s } from '../theme';
import { Body, Card, Row, Small } from '../ui';

const ICON = { good: 'check-circle', warn: 'alert-circle', info: 'zap' } as const;
const TINT = { good: c.good, warn: c.bad, info: c.gold };

/** One finding that links training, food and weight. */
export function InsightCard({ insight, style }: { insight: Insight; style?: StyleProp<ViewStyle> }) {
  return (
    <Card style={style}>
      <Row style={{ gap: s.sm, alignItems: 'flex-start' }}>
        <Feather name={ICON[insight.tone]} size={16} color={TINT[insight.tone]} style={{ marginTop: 3 }} />
        <View style={{ flex: 1 }}>
          <Body style={{ fontFamily: f.semi }}>{insight.title}</Body>
          <Small style={{ color: c.text, marginTop: 4, fontSize: 13.5, lineHeight: 20 }}>{insight.body}</Small>
        </View>
      </Row>
    </Card>
  );
}
