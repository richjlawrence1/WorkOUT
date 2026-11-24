import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { FoodSheet } from '../components/FoodSheet';
import { FOODS } from '../data/foods';
import { dayKey, uid } from '../lib/dates';
import { searchProducts } from '../lib/off';
import { useStore } from '../store';
import { c, s } from '../theme';
import type { Food, MealSlot } from '../types';
import { Body, Button, Card, Chip, ChipRow, Eyebrow, Field, Header, IconButton, Row, Screen, Small } from '../ui';

type Mode = 'search' | 'manual';

export default function AddFood() {
  const params = useLocalSearchParams<{ date?: string; slot?: MealSlot }>();
  const date = params.date ?? dayKey();
  const recent = useStore((st) => st.recentFoods);
  const [mode, setMode] = useState<Mode>('search');
  const [q, setQ] = useState('');
  const [online, setOnline] = useState<Food[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'done'>('idle');
  const [picked, setPicked] = useState<Food | null>(null);
  const reqId = useRef(0);

  const term = q.trim().toLowerCase();
  const local = useMemo(
    () => (term ? [...recent, ...FOODS].filter((x, i, a) => x.name.toLowerCase().includes(term) && a.findIndex((y) => y.id === x.id) === i) : []),
    [term, recent]
  );

  // Debounced product search; stale responses are ignored.
  useEffect(() => {
    if (term.length < 3) {
      setOnline([]);
      setStatus('idle');
      return;
    }
    const id = ++reqId.current;
    setStatus('loading');
    const timer = setTimeout(() => {
      searchProducts(term)
        .then((r) => { if (id === reqId.current) { setOnline(r); setStatus('done'); } })
        .catch(() => { if (id === reqId.current) { setOnline([]); setStatus('error'); } });
    }, 450);
    return () => clearTimeout(timer);
  }, [term]);

  if (picked) {
    return (
      <Screen>
        <Header title="Add food" onBack={() => setPicked(null)} />
        <FoodSheet food={picked} date={date} slot={params.slot} onCancel={() => setPicked(null)} onDone={() => router.back()} />
      </Screen>
    );
  }

  const row = (x: Food) => (
    <Pressable key={x.id} accessibilityRole="button" onPress={() => setPicked(x)} style={st.row}>
      <View style={{ flex: 1 }}>
        <Body numberOfLines={1}>{x.name}</Body>
        <Small>{x.brand ? `${x.brand} · ` : ''}{x.serving} · P {Math.round(x.protein)} g</Small>
      </View>
      <Body style={{ marginLeft: s.md }}>{x.kcal}</Body>
      <Feather name="plus" size={16} color={c.gold} style={{ marginLeft: s.md }} />
    </Pressable>
  );

  return (
    <Screen>
      <Header
        title="Add food"
        right={<IconButton icon="maximize" label="Scan barcode" color={c.gold} onPress={() => router.replace({ pathname: '/scan', params: { date, ...(params.slot ? { slot: params.slot } : {}) } })} />}
      />
      <ChipRow>
        <Chip label="Search" icon="search" selected={mode === 'search'} onPress={() => setMode('search')} />
        <Chip label="Enter manually" icon="edit-3" selected={mode === 'manual'} onPress={() => setMode('manual')} />
      </ChipRow>

      {mode === 'manual' ? (
        <Manual onCreate={setPicked} />
      ) : (
        <>
          <Field value={q} onChangeText={setQ} placeholder="Search foods and brands" style={{ marginTop: s.lg }} autoFocus />

          {!term && recent.length ? (
            <>
              <Eyebrow style={{ marginTop: s.xl, marginBottom: s.sm }}>Recent</Eyebrow>
              <Card style={{ paddingVertical: 4 }}>{recent.slice(0, 12).map(row)}</Card>
            </>
          ) : null}
          {!term && !recent.length ? (
            <Body muted style={{ marginTop: s.xl }}>
              Search everyday foods and supermarket products, including Aldi, Tesco, Sainsbury's and Lidl own-brand. Foods you log appear here for one-tap repeats.
            </Body>
          ) : null}

          {local.length ? (
            <>
              <Eyebrow style={{ marginTop: s.xl, marginBottom: s.sm }}>Staples</Eyebrow>
              <Card style={{ paddingVertical: 4 }}>{local.slice(0, 8).map(row)}</Card>
            </>
          ) : null}

          {term.length >= 3 ? (
            <>
              <Row style={{ marginTop: s.xl, marginBottom: s.sm, gap: s.sm }}>
                <Eyebrow>Products</Eyebrow>
                {status === 'loading' ? <ActivityIndicator size="small" color={c.gold} /> : null}
              </Row>
              {online.length ? <Card style={{ paddingVertical: 4 }}>{online.map(row)}</Card> : null}
              {status === 'done' && !online.length ? <Small>No products found for "{q.trim()}".</Small> : null}
              {status === 'error' ? <Small style={{ color: c.bad }}>Couldn't reach the product database. Check your connection, or enter the food manually.</Small> : null}
            </>
          ) : null}

          {term && !local.length && status !== 'loading' && !online.length ? (
            <Button label="Enter it manually" variant="ghost" icon="edit-3" style={{ marginTop: s.xl }} onPress={() => setMode('manual')} />
          ) : null}
        </>
      )}
    </Screen>
  );
}

function Manual({ onCreate }: { onCreate: (f: Food) => void }) {
  const [name, setName] = useState('');
  const [serving, setServing] = useState('');
  const [kcal, setKcal] = useState('');
  const [p, setP] = useState('');
  const [cb, setCb] = useState('');
  const [fat, setFat] = useState('');
  const n = (v: string) => Math.max(0, parseFloat(v.replace(',', '.')) || 0);
  const valid = name.trim().length > 0 && n(kcal) > 0;
  return (
    <View style={{ marginTop: s.lg, gap: s.lg }}>
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Chicken katsu curry" />
      <Row style={{ gap: s.md }}>
        <Field label="Serving" value={serving} onChangeText={setServing} placeholder="1 portion" style={{ flex: 1 }} />
        <Field label="Calories" value={kcal} onChangeText={setKcal} numeric suffix="kcal" style={{ flex: 1 }} />
      </Row>
      <Row style={{ gap: s.md }}>
        <Field label="Protein" value={p} onChangeText={setP} numeric suffix="g" style={{ flex: 1 }} />
        <Field label="Carbs" value={cb} onChangeText={setCb} numeric suffix="g" style={{ flex: 1 }} />
        <Field label="Fat" value={fat} onChangeText={setFat} numeric suffix="g" style={{ flex: 1 }} />
      </Row>
      <Button
        label="Continue"
        disabled={!valid}
        onPress={() => onCreate({ id: 'custom-' + uid(), name: name.trim(), serving: serving.trim() || '1 portion', kcal: Math.round(n(kcal)), protein: n(p), carbs: n(cb), fat: n(fat) })}
      />
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
});
