import React, { useState } from 'react';
import { View } from 'react-native';
import { scale } from '../lib/nutrition';
import { useStore } from '../store';
import { s } from '../theme';
import type { Food, MealSlot } from '../types';
import { Body, Button, Card, Chip, ChipRow, Eyebrow, Row, Small, Stat, Stepper, thud } from '../ui';

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const defaultSlot = (): MealSlot => {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
};

/** Confirms quantity and meal for a food, then logs it to the diary. */
export function FoodSheet({ food, date, slot, onDone, onCancel }: { food: Food; date: string; slot?: MealSlot; onDone: () => void; onCancel: () => void }) {
  const addDiary = useStore((st) => st.addDiary);
  const [qty, setQty] = useState(1);
  const [meal, setMeal] = useState<MealSlot>(slot ?? defaultSlot());
  const mac = scale(food, qty);
  return (
    <Card gold>
      <Eyebrow>{food.brand ?? 'Food'}</Eyebrow>
      <Body style={{ fontSize: 18, marginTop: 4 }}>{food.name}</Body>
      <Small>Per serving: {food.serving}</Small>
      <Row style={{ marginTop: s.lg }}>
        <Stat value={String(mac.kcal)} label="Calories" />
        <Stat value={String(Math.round(mac.protein))} unit="g" label="Protein" />
        <Stat value={String(Math.round(mac.carbs))} unit="g" label="Carbs" />
        <Stat value={String(Math.round(mac.fat))} unit="g" label="Fat" />
      </Row>
      <Eyebrow style={{ marginTop: s.lg, marginBottom: s.sm }}>Servings</Eyebrow>
      <Stepper value={qty} onChange={(v) => setQty(Math.round(v * 100) / 100)} min={0.25} max={10} step={0.25} />
      <ChipRow style={{ marginTop: s.lg }}>
        {SLOTS.map((k) => <Chip key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} selected={meal === k} onPress={() => setMeal(k)} />)}
      </ChipRow>
      <View style={{ flexDirection: 'row', gap: s.md, marginTop: s.lg }}>
        <Button label="Cancel" variant="ghost" style={{ flex: 1 }} onPress={onCancel} />
        <Button
          label="Add to diary"
          style={{ flex: 1 }}
          onPress={() => {
            addDiary(date, { name: food.name, detail: `${qty} × ${food.serving}`, slot: meal, kcal: mac.kcal, protein: mac.protein, carbs: mac.carbs, fat: mac.fat }, food);
            thud();
            onDone();
          }}
        />
      </View>
    </Card>
  );
}
