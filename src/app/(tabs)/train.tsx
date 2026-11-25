import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ExerciseDemo } from '../../components/ExerciseDemo';
import { EX, alternatives, estMinutes } from '../../lib/plan';
import { nextTarget } from '../../lib/progression';
import { PHASE_LABEL, phasedDay } from '../../lib/prescription';
import { useStore } from '../../store';
import { c, f, radius, s } from '../../theme';
import { Body, Button, Card, Chip, ChipRow, Eyebrow, IconButton, Row, Screen, Small, Title } from '../../ui';

export default function Train() {
  const { profile, plan, nextDay, sessions, active, startWorkout, swapExercise, regeneratePlan, phase, cardioMins } = useStore();
  const [sel, setSel] = useState(nextDay);
  const [swapping, setSwapping] = useState<number | null>(null);
  if (!profile || !plan) return null;
  const day = phasedDay(plan.days[Math.min(sel, plan.days.length - 1)], phase);
  const inPlan = day.exercises.map((e) => e.exId);

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Eyebrow>Your programme</Eyebrow>
        <IconButton icon="sliders" label="Programme settings" color={c.muted} onPress={() => router.push('/settings')} />
      </Row>
      <Title>{plan.split}</Title>
      <Small style={{ marginTop: 6 }}>
        {profile.daysPerWeek} sessions a week. Train them in order, resting when you need to.
      </Small>

      <ChipRow style={{ marginTop: s.xl }}>
        {plan.days.map((d, i) => (
          <Chip key={d.id} label={d.name} selected={i === sel} icon={i === nextDay ? 'play' : undefined} onPress={() => { setSel(i); setSwapping(null); }} />
        ))}
      </ChipRow>

      <Row style={{ justifyContent: 'space-between', marginTop: s.xl, marginBottom: s.md }}>
        <View>
          <Text style={st.dayName}>{day.name}</Text>
          <Small>{day.focus} · about {estMinutes(day)} min{phase !== 'standard' ? ` · ${PHASE_LABEL[phase]}` : ''}</Small>
          <Small>5 min warm-up first{cardioMins ? `, ${cardioMins} min cardio to finish` : ''}</Small>
        </View>
      </Row>

      {day.exercises.map((pe, i) => {
        const ex = EX[pe.exId];
        const t = nextTarget(sessions, pe, profile.goal);
        const alts = swapping === i ? alternatives(profile, pe.exId, inPlan).slice(0, 6) : [];
        return (
          <Card key={pe.exId + i} style={{ marginBottom: s.md, padding: s.md }}>
            <Row>
              <Pressable accessibilityRole="button" accessibilityLabel={`How to do ${ex.name}`} onPress={() => router.push(`/exercise/${ex.id}`)}>
                <ExerciseDemo id={ex.id} animate={false} style={st.thumb} />
              </Pressable>
              <Pressable style={{ flex: 1, marginLeft: s.md }} onPress={() => router.push(`/exercise/${ex.id}`)}>
                <Body style={{ fontFamily: f.medium }} numberOfLines={1}>{ex.name}</Body>
                <Small>
                  {t.sets} sets × {pe.repMin}-{pe.repMax} {ex.timed ? 'sec' : 'reps'}
                  {t.kg ? ` · ${t.kg} kg` : ''}
                </Small>
                {t.trend !== 'new' ? (
                  <Row style={{ gap: 4, marginTop: 2 }}>
                    <Feather name={t.trend === 'up' ? 'arrow-up-right' : t.trend === 'down' ? 'arrow-down-right' : t.trend === 'volume' ? 'plus' : 'minus'} size={12} color={t.trend === 'down' ? c.bad : c.gold} />
                    <Small style={{ color: t.trend === 'down' ? c.bad : c.gold }}>
                      {t.trend === 'up' ? 'Weight goes up' : t.trend === 'down' ? 'Lighter on purpose' : t.trend === 'volume' ? 'Extra set' : `Aim for ${t.reps}`}
                    </Small>
                  </Row>
                ) : null}
              </Pressable>
              <IconButton icon="repeat" label={`Swap ${ex.name}`} color={swapping === i ? c.gold : c.faint} onPress={() => setSwapping(swapping === i ? null : i)} />
            </Row>
            {swapping === i ? (
              <View style={st.swapBox}>
                <Small style={{ marginBottom: s.sm }}>{alts.length ? 'Swap for' : 'No alternatives with your equipment.'}</Small>
                {alts.map((a) => (
                  <Pressable key={a.id} accessibilityRole="button" style={st.alt} onPress={() => { swapExercise(day.id, i, a.id); setSwapping(null); }}>
                    <Body>{a.name}</Body>
                    <Feather name="chevron-right" size={16} color={c.faint} />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </Card>
        );
      })}

      <Button
        label={active ? 'Resume session' : `Start ${day.name}`}
        style={{ marginTop: s.md }}
        onPress={() => {
          if (!active) startWorkout(sel);
          router.push('/workout');
        }}
      />
      {!active ? <Button label="Sore, tired or short on time?" variant="quiet" icon="sliders" onPress={() => router.push({ pathname: '/adjust', params: { day: String(sel) } })} style={{ marginTop: s.sm }} /> : null}
      <Button label="Refresh exercise selection" variant="quiet" icon="refresh-cw" onPress={regeneratePlan} style={{ marginTop: s.sm }} />
    </Screen>
  );
}

const st = StyleSheet.create({
  dayName: { color: c.cream, fontFamily: f.serifSemi, fontSize: 22, letterSpacing: -0.4 },
  thumb: { width: 72, aspectRatio: 1, borderRadius: radius.sm },
  swapBox: { marginTop: s.md, paddingTop: s.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
  alt: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
});
