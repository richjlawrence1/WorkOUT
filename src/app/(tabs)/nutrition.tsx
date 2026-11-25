import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MealImage } from '../../components/MealImage';
import { MEAL } from '../../data/meals';
import { DAYS_MON, addDays, dayKey, fromKey, longDate } from '../../lib/dates';
import { dayMacros, plannedMacros, todayIndex } from '../../lib/mealplan';
import { sumMacros } from '../../lib/nutrition';
import { selectTargets, useStore } from '../../store';
import { c, f, radius, s } from '../../theme';
import type { MealSlot, PlannedMeal } from '../../types';
import { Bar, Body, Button, Card, Chip, ChipRow, Eyebrow, IconButton, Ring, Row, Screen, Small, Title, thud } from '../../ui';

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

export default function Nutrition() {
  const [tab, setTab] = useState<'diary' | 'plan'>('diary');
  return (
    <Screen>
      <Eyebrow>Nutrition</Eyebrow>
      <Title>{tab === 'diary' ? 'Food diary' : 'Meal plan'}</Title>
      <View style={st.segment}>
        {(['diary', 'plan'] as const).map((k) => (
          <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} onPress={() => setTab(k)} style={[st.seg, tab === k && st.segOn]}>
            <Text style={[st.segText, tab === k && { color: c.goldBright }]}>{k === 'diary' ? 'Diary' : 'Meal plan'}</Text>
          </Pressable>
        ))}
      </View>
      {tab === 'diary' ? <Diary /> : <Plan />}
    </Screen>
  );
}

function Diary() {
  const st0 = useStore();
  const [date, setDate] = useState(dayKey());
  const t = selectTargets(st0)!;
  const entries = st0.diary[date] ?? [];
  const eaten = sumMacros(entries);
  const isToday = date === dayKey();
  const over = eaten.kcal > t.kcal;

  return (
    <>
      <Row style={{ justifyContent: 'space-between', marginTop: s.md }}>
        <IconButton icon="chevron-left" label="Previous day" onPress={() => setDate(dayKey(addDays(fromKey(date), -1)))} />
        <Body style={{ fontFamily: f.medium }}>{isToday ? 'Today' : longDate(fromKey(date))}</Body>
        <IconButton icon="chevron-right" label="Next day" color={isToday ? c.line : c.cream} onPress={() => !isToday && setDate(dayKey(addDays(fromKey(date), 1)))} />
      </Row>

      <Card style={{ marginTop: s.sm }}>
        <Row style={{ gap: s.xl }}>
          <Ring progress={eaten.kcal / t.kcal} size={116} color={over ? c.bad : c.gold}>
            <Text style={st.ringValue}>{Math.abs(t.kcal - eaten.kcal)}</Text>
            <Small>{over ? 'kcal over' : 'kcal left'}</Small>
          </Ring>
          <View style={{ flex: 1, gap: s.md }}>
            <Bar label="Protein" value={eaten.protein} target={t.protein} />
            <Bar label="Carbs" value={eaten.carbs} target={t.carbs} />
            <Bar label="Fat" value={eaten.fat} target={t.fat} />
          </View>
        </Row>
        <Small style={{ marginTop: s.md }}>{eaten.kcal} eaten of {t.kcal} kcal target</Small>
      </Card>

      <Row style={{ gap: s.md, marginTop: s.md }}>
        <Button label="Scan barcode" icon="maximize" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/scan', params: { date } })} />
        <Button label="Search food" icon="search" variant="ghost" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/add-food', params: { date } })} />
      </Row>

      {SLOTS.map((slot) => {
        const list = entries.filter((e) => e.slot === slot);
        return (
          <View key={slot} style={{ marginTop: s.xl }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: s.sm }}>
              <Eyebrow>{slot === 'snack' ? 'Snacks' : cap(slot)}</Eyebrow>
              <Row style={{ gap: s.md }}>
                {list.length ? <Small>{sumMacros(list).kcal} kcal</Small> : null}
                <IconButton icon="plus" label={`Add to ${slot}`} color={c.gold} onPress={() => router.push({ pathname: '/add-food', params: { date, slot } })} />
              </Row>
            </Row>
            {list.length ? (
              <Card style={{ paddingVertical: 4 }}>
                {list.map((e, i) => (
                  <Row key={e.id} style={[st.entry, i > 0 && st.entryLine]}>
                    <View style={{ flex: 1 }}>
                      <Body numberOfLines={1}>{e.name}</Body>
                      <Small>{e.detail} · P {Math.round(e.protein)} · C {Math.round(e.carbs)} · F {Math.round(e.fat)}</Small>
                    </View>
                    <Text style={st.kcal}>{e.kcal}</Text>
                    <IconButton icon="x" label={`Remove ${e.name}`} color={c.faint} size={16} onPress={() => st0.removeDiary(date, e.id)} />
                  </Row>
                ))}
              </Card>
            ) : (
              <Small style={{ color: c.faint }}>Nothing logged</Small>
            )}
          </View>
        );
      })}
    </>
  );
}

function Plan() {
  const st0 = useStore();
  const { mealPlan, foodPrefs, favMeals } = st0;
  const [day, setDay] = useState(todayIndex());
  const [logged, setLogged] = useState<string | null>(null);
  const t = selectTargets(st0)!;

  if (!foodPrefs.set || !mealPlan) {
    return (
      <Card gold style={{ marginTop: s.xl }}>
        <Eyebrow>Your kitchen</Eyebrow>
        <Text style={st.planTitle}>A week of meals, built around you.</Text>
        <Body muted style={{ marginBottom: s.lg }}>
          Tell me what you eat and what you can't stand. I'll plan seven days that hit {t.kcal} kcal and {t.protein} g of protein, and repeat the meals you love.
        </Body>
        <Button label={foodPrefs.set ? 'Build my week' : 'Set food preferences'} onPress={() => (foodPrefs.set ? st0.buildMealPlan() : router.push('/food-prefs'))} />
      </Card>
    );
  }

  const meals = mealPlan.days[day] ?? [];
  const total = dayMacros(meals);
  const log = (pm: PlannedMeal, i: number) => {
    const m = MEAL[pm.mealId];
    st0.addDiary(dayKey(), { name: m.name, detail: `${pm.servings} serving${pm.servings === 1 ? '' : 's'}`, slot: pm.slot, ...plannedMacros(pm) });
    thud();
    setLogged(`${day}-${i}`);
  };

  return (
    <>
      <ChipRow style={{ marginTop: s.lg }}>
        {DAYS_MON.map((d, i) => <Chip key={d} label={d} selected={i === day} onPress={() => setDay(i)} />)}
      </ChipRow>

      <Card style={{ marginTop: s.lg }}>
        <Row style={{ gap: s.lg }}>
          <Bar label="Calories" value={total.kcal} target={t.kcal} unit="" />
          <Bar label="Protein" value={total.protein} target={t.protein} />
        </Row>
      </Card>

      {meals.map((pm, i) => {
        const m = MEAL[pm.mealId];
        const mac = plannedMacros(pm);
        const fav = favMeals.includes(m.id);
        const wasLogged = logged === `${day}-${i}`;
        return (
          <Card key={`${pm.mealId}-${i}`} style={{ marginTop: s.md, padding: 0, overflow: 'hidden' }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${m.name} recipe`} onPress={() => router.push({ pathname: '/meal/[id]', params: { id: m.id, servings: String(pm.servings) } })}>
              <MealImage id={m.id} style={{ aspectRatio: pm.slot === 'snack' ? 3 : 2 }} />
            </Pressable>
            <View style={{ padding: s.lg }}>
            <Row style={{ alignItems: 'flex-start' }}>
              <Pressable style={{ flex: 1 }} accessibilityRole="button" onPress={() => router.push({ pathname: '/meal/[id]', params: { id: m.id, servings: String(pm.servings) } })}>
                <Eyebrow>{cap(pm.slot)} · {m.mins} min</Eyebrow>
                <Text style={st.mealName}>{m.name}</Text>
                <Small>
                  {mac.kcal} kcal · {Math.round(mac.protein)} g protein
                  {pm.servings !== 1 ? ` · ${pm.servings}× portion` : ''}
                </Small>
              </Pressable>
              <IconButton icon="heart" label={fav ? 'Remove favourite' : 'Add favourite'} color={fav ? c.gold : c.faint} onPress={() => st0.toggleFav(m.id)} />
            </Row>
            <Row style={{ gap: s.sm, marginTop: s.md }}>
              <Button label={wasLogged ? 'Logged' : 'Log as eaten'} icon={wasLogged ? 'check' : 'plus'} small variant="ghost" onPress={() => log(pm, i)} disabled={wasLogged} />
              <Button label="Swap" icon="repeat" small variant="quiet" onPress={() => st0.swapPlanned(day, i)} />
            </Row>
            </View>
          </Card>
        );
      })}

      <Button label="Shopping list" icon="shopping-bag" variant="ghost" style={{ marginTop: s.xl }} onPress={() => router.push('/shopping')} />
      <Button label="Regenerate week" icon="refresh-cw" variant="quiet" onPress={st0.buildMealPlan} style={{ marginTop: s.sm }} />
      <Button label="Food preferences & favourites" icon="sliders" variant="quiet" onPress={() => router.push('/food-prefs')} />
      <Row style={{ gap: 6, marginTop: s.md, justifyContent: 'center' }}>
        <Feather name="heart" size={12} color={c.gold} />
        <Small>Favourites repeat through your week.</Small>
      </Row>
    </>
  );
}

const st = StyleSheet.create({
  segment: { flexDirection: 'row', backgroundColor: c.surface, borderRadius: radius.pill, padding: 4, marginTop: s.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line },
  seg: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: 'center' },
  segOn: { backgroundColor: c.goldWash },
  segText: { color: c.muted, fontFamily: f.medium, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' },
  ringValue: { color: c.cream, fontFamily: f.serif, fontSize: 26, lineHeight: 30, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  entry: { paddingVertical: 10 },
  entryLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
  kcal: { color: c.cream, fontFamily: f.medium, fontSize: 15, marginLeft: s.md, fontVariant: ['tabular-nums'] },
  planTitle: { color: c.cream, fontFamily: f.serif, fontSize: 24, lineHeight: 28, letterSpacing: -0.5, marginTop: s.sm, marginBottom: s.sm },
  mealName: { color: c.cream, fontFamily: f.serifSemi, fontSize: 19, lineHeight: 23, letterSpacing: -0.3, marginTop: 4, marginBottom: 2 },
});
