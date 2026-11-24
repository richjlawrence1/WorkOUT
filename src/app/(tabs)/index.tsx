import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ExerciseDemo } from '../../components/ExerciseDemo';
import { WeighInCard } from '../../components/WeighInCard';
import { MEAL } from '../../data/meals';
import { checkInDue, weighInDue } from '../../lib/checkin';
import { dayKey, greeting, longDate } from '../../lib/dates';
import { plannedMacros, todayIndex } from '../../lib/mealplan';
import { sumMacros } from '../../lib/nutrition';
import { EX, estMinutes } from '../../lib/plan';
import { selectTargets, sessionsThisWeek, useStore } from '../../store';
import { c, f, s } from '../../theme';
import { Bar, Body, Button, Card, Eyebrow, Ring, Row, Screen, Small, Title } from '../../ui';

export default function Today() {
  const st0 = useStore();
  const { profile, plan, nextDay, sessions, active, weights, checkins, onboardedAt, diary, mealPlan } = st0;
  if (!profile || !plan) return null;

  const t = selectTargets(st0)!;
  const eaten = sumMacros(diary[dayKey()] ?? []);
  const day = plan.days[nextDay] ?? plan.days[0];
  const done = sessionsThisWeek(sessions);
  const trainedToday = sessions.some((sn) => dayKey(new Date(sn.date)) === dayKey());
  const meals = mealPlan?.days[todayIndex()] ?? [];
  const left = Math.max(0, t.kcal - eaten.kcal);

  return (
    <Screen>
      <Eyebrow>{longDate(new Date())}</Eyebrow>
      <Title style={{ marginTop: s.sm }}>{greeting()}{profile.name ? `,\n${profile.name}` : ''}</Title>

      {checkInDue(checkins, onboardedAt) && (
        <Card gold onPress={() => router.push('/checkin')} style={{ marginTop: s.xl }}>
          <Row>
            <View style={{ flex: 1 }}>
              <Eyebrow>Weekly check-in</Eyebrow>
              <Body style={{ marginTop: 4 }}>Two minutes to review your week and retune the plan.</Body>
            </View>
            <Feather name="arrow-right" size={20} color={c.gold} />
          </Row>
        </Card>
      )}

      {weighInDue(weights, profile.weighInDay) && <WeighInCard style={{ marginTop: s.md }} />}

      {/* Training */}
      <Card style={{ marginTop: s.xl, padding: 0, overflow: 'hidden' }}>
        {day.exercises[0] ? <ExerciseDemo id={day.exercises[0].exId} rounded={false} animate={false} style={{ aspectRatio: 2.1, opacity: 0.55 }} /> : null}
        <View style={{ padding: s.lg }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Eyebrow>{active ? 'In progress' : trainedToday ? 'Up next' : "Today's session"}</Eyebrow>
            <Small>{done} of {profile.daysPerWeek} this week</Small>
          </Row>
          <Text style={st.sessionName}>{active ? active.dayName : day.name}</Text>
          <Small>{day.focus} · {day.exercises.length} exercises · about {estMinutes(day)} min</Small>
          <View style={st.dots}>
            {Array.from({ length: profile.daysPerWeek }, (_, i) => <View key={i} style={[st.dot, i < done && st.dotOn]} />)}
          </View>
          {trainedToday && !active ? (
            <Body muted style={{ marginBottom: s.md }}>Session logged today. Rest, eat well, and come back stronger.</Body>
          ) : null}
          <Button
            label={active ? 'Resume session' : trainedToday ? 'Train again' : 'Begin session'}
            variant={trainedToday && !active ? 'ghost' : 'gold'}
            onPress={() => {
              if (!active) st0.startWorkout(plan.days.indexOf(day));
              router.push('/workout');
            }}
          />
          <View style={{ marginTop: s.md }}>
            {day.exercises.slice(0, 3).map((pe) => (
              <Row key={pe.exId} style={{ justifyContent: 'space-between', paddingVertical: 5 }}>
                <Body muted>{EX[pe.exId]?.name}</Body>
                <Small>{pe.sets} × {pe.repMin}-{pe.repMax}{EX[pe.exId]?.timed ? ' s' : ''}</Small>
              </Row>
            ))}
            {day.exercises.length > 3 ? <Small>+ {day.exercises.length - 3} more</Small> : null}
          </View>
        </View>
      </Card>

      {/* Nutrition */}
      <Card style={{ marginTop: s.md }} onPress={() => router.push('/nutrition')}>
        <Eyebrow>Nutrition</Eyebrow>
        <Row style={{ marginTop: s.lg, gap: s.xl }}>
          <Ring progress={eaten.kcal / t.kcal} size={108}>
            <Text style={st.ringValue}>{left}</Text>
            <Small>kcal left</Small>
          </Ring>
          <View style={{ flex: 1, gap: s.md }}>
            <Bar label="Protein" value={eaten.protein} target={t.protein} />
            <Bar label="Carbs" value={eaten.carbs} target={t.carbs} />
            <Bar label="Fat" value={eaten.fat} target={t.fat} />
          </View>
        </Row>
      </Card>

      {/* Meals */}
      <Card style={{ marginTop: s.md }} onPress={() => router.push('/nutrition')}>
        <Eyebrow>On the menu</Eyebrow>
        {meals.length ? (
          meals.map((pm, i) => (
            <Row key={i} style={{ justifyContent: 'space-between', paddingTop: s.md }}>
              <View style={{ flex: 1, paddingRight: s.md }}>
                <Small style={{ textTransform: 'capitalize' }}>{pm.slot}</Small>
                <Body numberOfLines={1}>{MEAL[pm.mealId].name}</Body>
              </View>
              <Small>{plannedMacros(pm).kcal} kcal</Small>
            </Row>
          ))
        ) : (
          <Body muted style={{ marginTop: s.sm }}>Tell me what you like to eat and I'll plan your week around your targets.</Body>
        )}
      </Card>
    </Screen>
  );
}

const st = StyleSheet.create({
  sessionName: { color: c.cream, fontFamily: f.serif, fontSize: 32, lineHeight: 36, fontVariant: ['lining-nums'], marginTop: 6, marginBottom: 2 },
  dots: { flexDirection: 'row', gap: 6, marginVertical: s.lg },
  dot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: c.line },
  dotOn: { backgroundColor: c.gold },
  ringValue: { color: c.cream, fontFamily: f.serif, fontSize: 28, lineHeight: 30, fontVariant: ['lining-nums', 'tabular-nums'] },
});
