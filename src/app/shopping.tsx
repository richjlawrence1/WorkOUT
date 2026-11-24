import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { shoppingList } from '../lib/mealplan';
import { useStore } from '../store';
import { c, s } from '../theme';
import { Body, Card, Header, Screen, Small, Title, tap } from '../ui';

export default function Shopping() {
  const mealPlan = useStore((st) => st.mealPlan);
  const list = useMemo(() => (mealPlan ? shoppingList(mealPlan) : []), [mealPlan]);
  const [got, setGot] = useState<string[]>([]);
  return (
    <Screen>
      <Header title="Shopping" />
      <Title>This week's shop</Title>
      <Small style={{ marginTop: 6 }}>
        {list.length} items across your plan. Quantities are per serving, multiplied by how often each appears.
      </Small>
      <Card style={{ marginTop: s.xl, paddingVertical: 4 }}>
        {list.map((row, i) => {
          const on = got.includes(row.item);
          return (
            <Pressable
              key={row.item}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => { tap(); setGot(on ? got.filter((x) => x !== row.item) : [...got, row.item]); }}
              style={[st.row, i > 0 && st.line]}
            >
              <View style={[st.box, on && st.boxOn]}>{on ? <Feather name="check" size={13} color="#17130A" /> : null}</View>
              <View style={{ flex: 1 }}>
                <Body style={on ? { color: c.faint, textDecorationLine: 'line-through' } : undefined}>{row.item}</Body>
                <Small>{row.qty.join(' / ')}{row.uses > 1 ? ` · used ${row.uses}×` : ''}</Small>
              </View>
            </Pressable>
          );
        })}
        {!list.length ? <Body muted style={{ paddingVertical: s.md }}>Build a meal plan first and your list will appear here.</Body> : null}
      </Card>
    </Screen>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: c.faint, marginRight: s.md, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: c.gold, borderColor: c.gold },
});
