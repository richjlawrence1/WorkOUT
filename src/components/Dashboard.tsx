import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { windowAvg } from '../lib/checkin';
import { addDays, dayKey, fromKey, shortDate } from '../lib/dates';
import { weekNutrition } from '../lib/insights';
import { CARDIO_TYPES, PHASE_LABEL, projection } from '../lib/prescription';
import { bodyParts, deltaParts, fmtAmount, fmtBody } from '../lib/units';
import { selectTargets, selectWeight, sessionsThisWeek, useStore } from '../store';
import { c, f, radius, s } from '../theme';
import { Body, Button, Card, Chip, ChipRow, Eyebrow, Field, Row, Small, tap, thud } from '../ui';

const GOAL_TITLE = { lose: 'Lose fat', build: 'Build muscle', recomp: 'Lean out and tone', strength: 'Get stronger' } as const;

/** Consecutive days, ending today or yesterday, with anything logged. */
function streak(active: Set<string>): number {
  let d = new Date();
  if (!active.has(dayKey(d))) d = addDays(d, -1);
  let n = 0;
  while (active.has(dayKey(d))) {
    n += 1;
    d = addDays(d, -1);
  }
  return n;
}

/** The goal, front and centre: how far there is to go and when you'll get there. */
export function GoalHero() {
  const st0 = useStore();
  const p = st0.profile!;
  const u = p.units ?? 'kg';
  const current = selectWeight(st0);
  const hasTarget = Math.abs(p.targetWeightKg - p.startWeightKg) >= 0.5;
  const total = p.targetWeightKg - p.startWeightKg;
  const done = current - p.startWeightKg;
  const pct = hasTarget ? Math.min(1, Math.max(0, done / total)) : Math.min(1, sessionsThisWeek(st0.sessions) / p.daysPerWeek);
  const toGo = p.targetWeightKg - current;
  const reached = hasTarget && Math.sign(toGo) !== Math.sign(total) ;
  const proj = hasTarget && !reached ? projection(current, p.targetWeightKg, p.goal, st0.weights) : null;

  return (
    <View style={st.hero}>
      <Eyebrow>Your goal · {GOAL_TITLE[p.goal]}</Eyebrow>
      {hasTarget ? (
        <>
          <Text style={st.big} adjustsFontSizeToFit numberOfLines={1}>
            {reached ? 'Goal reached' : fmtAmount(toGo, u)}
            {!reached ? <Text style={st.bigUnit}> to go</Text> : null}
          </Text>
          <View style={st.track}><View style={[st.fill, { width: `${Math.max(2, pct * 100)}%` }]} /></View>
          <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <Small>Start {fmtBody(p.startWeightKg, u)}</Small>
            <Small style={{ color: c.cream }}>Now {fmtBody(current, u)}</Small>
            <Small style={{ color: c.gold }}>Goal {fmtBody(p.targetWeightKg, u)}</Small>
          </Row>
          <Small style={{ marginTop: s.md, color: c.text }}>
            {reached
              ? 'You hit your target. Set a new one in Settings, or move to maintaining.'
              : proj
                ? proj.fromTrend
                  ? `At your current rate you'll be there around ${shortDate(proj.date)}, about ${proj.weeks} week${proj.weeks === 1 ? '' : 's'}.`
                  : `At the planned pace that's about ${proj.weeks} weeks, around ${shortDate(proj.date)}. Weigh in twice a week and I'll forecast from your real trend.`
                : ''}
          </Small>
        </>
      ) : (
        <>
          <Text style={st.big} adjustsFontSizeToFit numberOfLines={1}>{GOAL_TITLE[p.goal]}</Text>
          <View style={st.track}><View style={[st.fill, { width: `${Math.max(2, pct * 100)}%` }]} /></View>
          <Small style={{ marginTop: 8 }}>{sessionsThisWeek(st0.sessions)} of {p.daysPerWeek} sessions this week. Add a goal weight in Settings to track it here.</Small>
        </>
      )}
    </View>
  );
}

/** Six numbers that say how the week is going. */
export function StatGrid() {
  const st0 = useStore();
  const p = st0.profile!;
  const u = p.units ?? 'kg';
  const t = selectTargets(st0)!;
  const since = addDays(new Date(), -7);
  const now = windowAvg(st0.weights, 0), before = windowAvg(st0.weights, 7);
  const wk = now != null && before != null ? deltaParts(now - before, u) : null;
  const cardioDone = st0.cardioLog.filter((x) => fromKey(x.date) > since).reduce((m, x) => m + x.minutes, 0);
  const cardioPlan = st0.cardioMins * p.daysPerWeek;
  const stepsToday = st0.steps[dayKey()] ?? 0;
  const food = weekNutrition(st0.diary, t);
  const active = new Set<string>([
    ...st0.sessions.map((x) => dayKey(new Date(x.date))), ...st0.cardioLog.map((x) => x.date),
    ...Object.keys(st0.diary).filter((k) => st0.diary[k].length), ...Object.keys(st0.steps).filter((k) => st0.steps[k] > 0),
  ]);
  const cur = bodyParts(selectWeight(st0), u);

  const tile = (value: string, unit: string, label: string, pct?: number, onPress?: () => void) => (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress ? () => { tap(); onPress(); } : undefined} style={st.tile}>
      <Text style={st.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}<Text style={st.tileUnit}> {unit}</Text>
      </Text>
      <Small>{label}</Small>
      {pct != null ? <View style={st.miniTrack}><View style={[st.miniFill, { width: `${Math.min(100, Math.max(0, pct * 100))}%` }]} /></View> : null}
    </Pressable>
  );

  return (
    <View style={st.grid}>
      {tile(cur.value, cur.unit, wk ? `${wk.value} ${wk.unit} this week` : 'Body weight', undefined, () => router.push('/progress'))}
      {tile(`${sessionsThisWeek(st0.sessions)}/${p.daysPerWeek}`, '', 'Sessions this week', sessionsThisWeek(st0.sessions) / p.daysPerWeek)}
      {tile(String(cardioDone), `/ ${cardioPlan} min`, 'Cardio, last 7 days', cardioPlan ? cardioDone / cardioPlan : 0)}
      {tile(stepsToday ? stepsToday.toLocaleString() : '–', `/ ${(st0.stepTarget / 1000).toFixed(st0.stepTarget % 1000 ? 1 : 0)}k`, 'Steps today', stepsToday / st0.stepTarget)}
      {tile(food.avgProtein != null ? String(food.avgProtein) : '–', `/ ${t.protein} g`, 'Protein, daily average', food.avgProtein != null ? food.avgProtein / t.protein : 0)}
      {tile(String(streak(active)), 'days', 'Active streak')}
    </View>
  );
}

/** What the coach has prescribed this week, and what changed at the last check-in. */
export function CoachPlan() {
  const st0 = useStore();
  const p = st0.profile!;
  const t = selectTargets(st0)!;
  const last = st0.checkins[st0.checkins.length - 1];
  const changed = (label: string) => last?.changes?.find((x) => x.label === label);
  const row = (icon: React.ComponentProps<typeof Feather>['name'], label: string, value: string, key: string) => {
    const ch = changed(key);
    return (
      <View style={st.planRow}>
        <Feather name={icon} size={16} color={c.gold} style={{ width: 26 }} />
        <View style={{ flex: 1 }}>
          <Small>{label}</Small>
          <Body style={{ fontFamily: f.semi }}>{value}</Body>
          {ch ? <Small style={{ color: c.gold, marginTop: 2 }}>Changed from {ch.from}. {ch.why}</Small> : null}
        </View>
      </View>
    );
  };
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Eyebrow>Your coach's plan this week</Eyebrow>
        {last ? <Small>Set {shortDate(new Date(last.date))}</Small> : null}
      </Row>
      {row('zap', 'Calories', `${t.kcal} kcal · ${t.protein} g protein`, 'Calories')}
      {row('heart', 'Cardio', st0.cardioMins ? `${st0.cardioMins} min after each session · ${st0.cardioMins * p.daysPerWeek} min a week` : 'None this week', 'Cardio')}
      {row('navigation', 'Steps', `${st0.stepTarget.toLocaleString()} a day`, 'Daily steps')}
      {row('repeat', 'Training', `${p.daysPerWeek} sessions · ${PHASE_LABEL[st0.phase]}`, 'Reps')}
      <Small style={{ marginTop: s.md }}>
        {last ? 'I review this at every weekly check-in and move one thing at a time.' : 'Your first check-in is a week after you start. I adjust this from your results.'}
      </Small>
    </Card>
  );
}

/** Quick logging for the two things done away from the weights. */
export function MoveLogger() {
  const st0 = useStore();
  const [steps, setSteps] = useState('');
  const [mins, setMins] = useState(String(st0.cardioMins || 15));
  const [type, setType] = useState(CARDIO_TYPES[0]);
  const [open, setOpen] = useState<'steps' | 'cardio' | null>(null);
  const today = st0.cardioLog.filter((x) => x.date === dayKey());
  const n = parseInt(steps.replace(/[^0-9]/g, ''), 10);
  const m = parseInt(mins, 10);
  return (
    <Card>
      <Eyebrow>Log movement</Eyebrow>
      <Row style={{ gap: s.sm, marginTop: s.md }}>
        <Button label={st0.steps[dayKey()] ? 'Update steps' : 'Log steps'} icon="navigation" small variant={open === 'steps' ? 'gold' : 'ghost'} style={{ flex: 1 }} onPress={() => setOpen(open === 'steps' ? null : 'steps')} />
        <Button label="Log cardio" icon="heart" small variant={open === 'cardio' ? 'gold' : 'ghost'} style={{ flex: 1 }} onPress={() => setOpen(open === 'cardio' ? null : 'cardio')} />
      </Row>
      {open === 'steps' ? (
        <View style={{ marginTop: s.md }}>
          <Small style={{ marginBottom: s.sm }}>Check the Health app or your watch and enter today's total.</Small>
          <Row style={{ gap: s.md }}>
            <Field value={steps} onChangeText={setSteps} numeric placeholder="e.g. 8200" suffix="steps" style={{ flex: 1 }} />
            <Button label="Save" small disabled={!(n > 0 && n < 100000)} onPress={() => { st0.logSteps(n); setSteps(''); setOpen(null); thud(); }} />
          </Row>
        </View>
      ) : null}
      {open === 'cardio' ? (
        <View style={{ marginTop: s.md }}>
          <ChipRow>{CARDIO_TYPES.map((x) => <Chip key={x} label={x} selected={type === x} onPress={() => setType(x)} />)}</ChipRow>
          <Row style={{ gap: s.md, marginTop: s.md }}>
            <Field value={mins} onChangeText={setMins} numeric suffix="min" style={{ flex: 1 }} />
            <Button label="Save" small disabled={!(m > 0 && m <= 300)} onPress={() => { st0.logCardio(m, type); setOpen(null); thud(); }} />
          </Row>
        </View>
      ) : null}
      {today.map((x) => (
        <Row key={x.id} style={{ justifyContent: 'space-between', marginTop: s.md }}>
          <Small style={{ color: c.text }}>{x.type} · {x.minutes} min today</Small>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${x.type}`} hitSlop={10} onPress={() => st0.removeCardio(x.id)}>
            <Feather name="x" size={14} color={c.faint} />
          </Pressable>
        </Row>
      ))}
    </Card>
  );
}

const st = StyleSheet.create({
  hero: { marginTop: s.lg, padding: s.xl, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.goldDim },
  big: { color: c.cream, fontFamily: f.heavy, fontSize: 56, lineHeight: 62, letterSpacing: -2.5, marginTop: s.sm },
  bigUnit: { color: c.gold, fontFamily: f.serif, fontSize: 24, letterSpacing: -0.5 },
  track: { height: 8, borderRadius: 4, backgroundColor: c.line, marginTop: s.lg, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: c.gold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm, marginTop: s.md },
  tile: { width: '48.5%', flexGrow: 1, backgroundColor: c.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line, padding: s.md },
  tileValue: { color: c.cream, fontFamily: f.serif, fontSize: 26, letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  tileUnit: { color: c.muted, fontFamily: f.sans, fontSize: 12, letterSpacing: 0 },
  miniTrack: { height: 3, borderRadius: 2, backgroundColor: c.line, marginTop: 10, overflow: 'hidden' },
  miniFill: { height: 3, backgroundColor: c.gold },
  planRow: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: s.md },
});
