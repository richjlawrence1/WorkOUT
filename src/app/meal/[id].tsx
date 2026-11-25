import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { MealImage } from '../../components/MealImage';
import { MEAL } from '../../data/meals';
import { dayKey } from '../../lib/dates';
import { scale } from '../../lib/nutrition';
import { useStore } from '../../store';
import { c, s } from '../../theme';
import { Body, Button, Card, Eyebrow, Header, IconButton, Row, Rule, Screen, Small, Stat, Title, thud } from '../../ui';

export default function MealDetail() {
  const { id, servings } = useLocalSearchParams<{ id: string; servings?: string }>();
  const { favMeals, toggleFav, addDiary } = useStore();
  const m = MEAL[id];
  if (!m) return <Screen><Header title="Meal" /><Body>Meal not found.</Body></Screen>;
  const k = parseFloat(servings ?? '1') || 1;
  const mac = scale(m, k);
  const fav = favMeals.includes(m.id);

  return (
    <Screen
      footer={
        <Button
          label="Log as eaten"
          icon="plus"
          onPress={() => {
            addDiary(dayKey(), { name: m.name, detail: `${k} serving${k === 1 ? '' : 's'}`, slot: m.slot, kcal: mac.kcal, protein: mac.protein, carbs: mac.carbs, fat: mac.fat });
            thud();
            router.back();
          }}
        />
      }
    >
      <Header title="Recipe" right={<IconButton icon="heart" label={fav ? 'Remove favourite' : 'Add favourite'} color={fav ? c.gold : c.faint} onPress={() => toggleFav(m.id)} />} />
      <MealImage id={m.id} style={{ aspectRatio: 3 / 2, borderRadius: 16, marginBottom: s.xl }} />
      <Eyebrow style={{ textTransform: 'uppercase' }}>{m.slot} · {m.mins} min</Eyebrow>
      <Title style={{ marginTop: 4 }}>{m.name}</Title>
      {fav ? <Small style={{ color: c.gold, marginTop: 6 }}>A favourite. This repeats in your weekly plan.</Small> : null}

      <Card style={{ marginTop: s.xl }}>
        <Row>
          <Stat value={String(mac.kcal)} label="Calories" />
          <Stat value={String(Math.round(mac.protein))} unit="g" label="Protein" />
          <Stat value={String(Math.round(mac.carbs))} unit="g" label="Carbs" />
          <Stat value={String(Math.round(mac.fat))} unit="g" label="Fat" />
        </Row>
        {k !== 1 ? <Small style={{ marginTop: s.md }}>Shown for your {k}× portion. Scale the ingredients below to match.</Small> : null}
      </Card>

      <Eyebrow style={{ marginTop: s.xl }}>Ingredients · 1 serving</Eyebrow>
      <View style={{ marginTop: s.sm }}>
        {m.ingredients.map(([item, qty], i) => (
          <View key={item}>
            {i ? <Rule style={{ marginVertical: 0 }} /> : null}
            <Row style={{ justifyContent: 'space-between', paddingVertical: 12 }}>
              <Body>{item}</Body>
              <Small>{qty}</Small>
            </Row>
          </View>
        ))}
      </View>

      <Eyebrow style={{ marginTop: s.xl, marginBottom: s.sm }}>Method</Eyebrow>
      <Body>{m.method}</Body>
      <Small style={{ marginTop: s.lg }}>Nutrition values are estimates and vary by brand. Scan your ingredients for exact figures.</Small>
    </Screen>
  );
}
