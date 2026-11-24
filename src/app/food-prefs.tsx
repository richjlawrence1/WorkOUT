import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FOOD_TAGS } from '../data/meals';
import { allowedMeals } from '../lib/mealplan';
import { useStore } from '../store';
import { c, s } from '../theme';
import type { FoodPrefs, MealSlot } from '../types';
import { Body, Button, Card, Chip, ChipRow, Eyebrow, Header, Row, Screen, Small, Stepper, Title, tap } from '../ui';

const DIETS: [FoodPrefs['diet'], string][] = [['any', 'I eat everything'], ['pescatarian', 'Pescatarian'], ['vegetarian', 'Vegetarian'], ['vegan', 'Vegan']];
const SLOTS: [MealSlot, string][] = [['breakfast', 'Breakfasts'], ['lunch', 'Lunches'], ['dinner', 'Dinners'], ['snack', 'Snacks']];

export default function FoodPrefsScreen() {
  const { foodPrefs, favMeals, setFoodPrefs, toggleFav, buildMealPlan } = useStore();
  const [diet, setDiet] = useState(foodPrefs.diet);
  const [dislikes, setDislikes] = useState<string[]>(foodPrefs.dislikes);
  const [snacks, setSnacks] = useState(foodPrefs.snacks);

  const prefs: FoodPrefs = { diet, dislikes, snacks, set: true };
  const allowed = useMemo(() => allowedMeals(prefs), [diet, dislikes]); // eslint-disable-line react-hooks/exhaustive-deps
  const thin = SLOTS.filter(([sl]) => sl !== 'snack' && allowed.filter((m) => m.slot === sl).length < 2).map(([, label]) => label.toLowerCase());

  const save = () => {
    setFoodPrefs(prefs);
    // Drop favourites that the new preferences exclude.
    favMeals.filter((id) => !allowed.some((m) => m.id === id)).forEach(toggleFav);
    buildMealPlan();
    router.back();
  };

  return (
    <Screen footer={<Button label="Save & build my week" onPress={save} />}>
      <Header title="Preferences" />
      <Title>How do you like to eat?</Title>

      <Eyebrow style={{ marginTop: s.xl, marginBottom: s.md }}>Diet</Eyebrow>
      <ChipRow>
        {DIETS.map(([k, label]) => <Chip key={k} label={label} selected={diet === k} onPress={() => setDiet(k)} />)}
      </ChipRow>

      <Eyebrow style={{ marginTop: s.xl }}>Foods to leave out</Eyebrow>
      <Small style={{ marginTop: 4, marginBottom: s.md }}>Tap anything you don't like. It won't appear in your plan.</Small>
      <ChipRow>
        {FOOD_TAGS.map(([k, label]) => {
          const on = dislikes.includes(k);
          return <Chip key={k} label={label} selected={on} icon={on ? 'slash' : undefined} onPress={() => setDislikes(on ? dislikes.filter((x) => x !== k) : [...dislikes, k])} />;
        })}
      </ChipRow>
      {thin.length ? (
        <Small style={{ color: c.bad, marginTop: s.md }}>
          That leaves very few {thin.join(' and ')} to choose from, so expect repeats. Allow one or two more foods for variety.
        </Small>
      ) : null}

      <Eyebrow style={{ marginTop: s.xl, marginBottom: s.md }}>Snacks per day</Eyebrow>
      <Stepper value={snacks} onChange={setSnacks} min={0} max={3} />

      <Eyebrow style={{ marginTop: s.xl }}>Favourites</Eyebrow>
      <Small style={{ marginTop: 4 }}>Heart the meals you'd happily eat again and again. I'll repeat them through your week.</Small>
      {SLOTS.map(([slot, label]) => {
        const list = allowed.filter((m) => m.slot === slot);
        if (!list.length) return null;
        return (
          <Card key={slot} style={{ marginTop: s.md, paddingVertical: 4 }}>
            <Small style={{ paddingTop: s.md }}>{label}</Small>
            {list.map((m, i) => {
              const fav = favMeals.includes(m.id);
              return (
                <Pressable
                  key={m.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: fav }}
                  accessibilityLabel={`Favourite ${m.name}`}
                  onPress={() => { tap(); toggleFav(m.id); }}
                  style={[st.row, i > 0 && st.line]}
                >
                  <View style={{ flex: 1 }}>
                    <Body numberOfLines={1}>{m.name}</Body>
                    <Small>{m.kcal} kcal · {m.protein} g protein</Small>
                  </View>
                  <Feather name="heart" size={18} color={fav ? c.gold : c.faint} />
                </Pressable>
              );
            })}
          </Card>
        );
      })}
      <Row style={{ height: s.lg }}><View /></Row>
    </Screen>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
});
