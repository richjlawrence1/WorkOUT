import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { WeighInCard } from '../../components/WeighInCard';
import { checkInDue, windowAvg } from '../../lib/checkin';
import { fromKey, shortDate } from '../../lib/dates';
import { EX } from '../../lib/plan';
import { bestE1rm, sessionVolume } from '../../lib/progression';
import { selectWeight, sessionsThisWeek, useStore } from '../../store';
import { c, f, s } from '../../theme';
import type { WeightEntry } from '../../types';
import { Body, Button, Card, Eyebrow, IconButton, Row, Rule, Screen, Small, Stat, Title } from '../../ui';

export default function Progress() {
  const st0 = useStore();
  const { profile, weights, sessions, checkins, onboardedAt } = st0;
  if (!profile) return null;
  const current = selectWeight(st0);
  const change = current - profile.startWeightKg;
  const toGo = profile.targetWeightKg - current;
  const avg = windowAvg(weights, 0);
  const lifts = [...new Set(sessions.flatMap((sn) => sn.entries.map((e) => e.exId)))]
    .map((id) => ({ id, best: bestE1rm(sessions, id) }))
    .filter((x) => x.best > 0 && EX[x.id]?.compound)
    .sort((a, b) => b.best - a.best)
    .slice(0, 5);
  const lastCheck = checkins[checkins.length - 1];

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Eyebrow>Progress</Eyebrow>
        <IconButton icon="settings" label="Settings" color={c.muted} onPress={() => router.push('/settings')} />
      </Row>
      <Title>Your numbers</Title>

      <Card style={{ marginTop: s.xl }}>
        <Eyebrow>Body weight</Eyebrow>
        <Row style={{ marginTop: s.md }}>
          <Stat value={current.toFixed(1)} unit="kg" label="Current" />
          <Stat value={`${change > 0 ? '+' : ''}${change.toFixed(1)}`} unit="kg" label="Since start" />
          {Math.abs(toGo) >= 0.1 && profile.targetWeightKg !== profile.startWeightKg ? (
            <Stat value={Math.abs(toGo).toFixed(1)} unit="kg" label="To goal" />
          ) : (
            <Stat value={avg ? avg.toFixed(1) : '–'} unit={avg ? 'kg' : undefined} label="7-day avg" />
          )}
        </Row>
        {weights.length > 1 ? <WeightChart data={weights.slice(-30)} target={profile.targetWeightKg} /> : (
          <Small style={{ marginTop: s.md }}>Your trend line appears after your second weigh-in.</Small>
        )}
      </Card>

      <WeighInCard style={{ marginTop: s.md }} title="Log weight" />

      <Card style={{ marginTop: s.md }} gold={checkInDue(checkins, onboardedAt)}>
        <Eyebrow>Weekly check-in</Eyebrow>
        {lastCheck ? (
          <>
            <Body style={{ marginTop: s.sm }}>{lastCheck.verdict}</Body>
            <Small style={{ marginTop: 4 }}>
              {shortDate(new Date(lastCheck.date))} · {lastCheck.workoutsDone}/{lastCheck.workoutsPlanned} sessions
              {lastCheck.kcalDelta ? ` · ${lastCheck.kcalDelta > 0 ? '+' : ''}${lastCheck.kcalDelta} kcal` : ''}
            </Small>
          </>
        ) : (
          <Body muted style={{ marginTop: s.sm }}>Each week I review your weigh-ins, training and food, then adjust your calories.</Body>
        )}
        <Button label={checkInDue(checkins, onboardedAt) ? 'Check in now' : 'Check in early'} variant={checkInDue(checkins, onboardedAt) ? 'gold' : 'ghost'} small style={{ marginTop: s.md, alignSelf: 'flex-start' }} onPress={() => router.push('/checkin')} />
      </Card>

      <Card style={{ marginTop: s.md }}>
        <Eyebrow>Training</Eyebrow>
        <Row style={{ marginTop: s.md }}>
          <Stat value={String(sessions.length)} label="Sessions" />
          <Stat value={`${sessionsThisWeek(sessions)}/${profile.daysPerWeek}`} label="This week" />
          <Stat value={Math.round(sessions.reduce((v, sn) => v + sessionVolume(sn), 0) / 1000).toLocaleString()} unit="t" label="Total lifted" />
        </Row>
        {lifts.length ? (
          <>
            <Rule />
            <Small style={{ marginBottom: s.sm }}>Strongest lifts · estimated one-rep max</Small>
            {lifts.map((l) => (
              <Row key={l.id} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
                <Body>{EX[l.id].name}</Body>
                <Body style={{ color: c.gold, fontFamily: f.medium }}>{l.best.toFixed(1)} kg</Body>
              </Row>
            ))}
          </>
        ) : null}
      </Card>

      {sessions.length ? (
        <Card style={{ marginTop: s.md }}>
          <Eyebrow>Recent sessions</Eyebrow>
          {sessions.slice(-6).reverse().map((sn, i) => (
            <View key={sn.id}>
              {i ? <Rule style={{ marginVertical: s.md }} /> : <View style={{ height: s.md }} />}
              <Row style={{ justifyContent: 'space-between' }}>
                <View>
                  <Body>{sn.dayName}</Body>
                  <Small>{shortDate(new Date(sn.date))} · {Math.max(1, Math.round(sn.durationSec / 60))} min</Small>
                </View>
                <Small>{Math.round(sessionVolume(sn)).toLocaleString()} kg</Small>
              </Row>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

function WeightChart({ data, target }: { data: WeightEntry[]; target: number }) {
  const w = 320, h = 140, padL = 34, padR = 8, padY = 14;
  const vals = data.map((d) => d.kg);
  const showTarget = Math.abs(target - vals[vals.length - 1]) < 15;
  const all = showTarget ? [...vals, target] : vals;
  const lo = Math.min(...all) - 0.5, hi = Math.max(...all) + 0.5;
  const t0 = fromKey(data[0].date).getTime();
  const span = Math.max(1, fromKey(data[data.length - 1].date).getTime() - t0);
  const x = (d: WeightEntry) => padL + ((fromKey(d.date).getTime() - t0) / span) * (w - padL - padR);
  const y = (kg: number) => padY + (1 - (kg - lo) / (hi - lo)) * (h - padY * 2);
  const last = data[data.length - 1];
  return (
    <View style={{ marginTop: s.md }} accessibilityRole="image" accessibilityLabel={`Weight trend from ${vals[0]} to ${last.kg} kilograms`}>
      <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        {[hi, (hi + lo) / 2, lo].map((v, i) => (
          <React.Fragment key={i}>
            <Line x1={padL} x2={w - padR} y1={y(v)} y2={y(v)} stroke={c.line} strokeWidth={0.5} />
            <SvgText x={0} y={y(v) + 3} fill={c.faint} fontSize={9}>{v.toFixed(1)}</SvgText>
          </React.Fragment>
        ))}
        {showTarget ? <Line x1={padL} x2={w - padR} y1={y(target)} y2={y(target)} stroke={c.goldDim} strokeWidth={1} strokeDasharray="3 4" /> : null}
        <Polyline points={data.map((d) => `${x(d)},${y(d.kg)}`).join(' ')} fill="none" stroke={c.gold} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d) => <Circle key={d.date} cx={x(d)} cy={y(d.kg)} r={2} fill={c.gold} />)}
        <Circle cx={x(last)} cy={y(last.kg)} r={4} fill={c.goldBright} />
      </Svg>
      <Row style={{ justifyContent: 'space-between', paddingLeft: padL }}>
        <Small>{shortDate(fromKey(data[0].date))}</Small>
        {showTarget ? <Small style={{ color: c.goldDim }}>- - goal {target} kg</Small> : null}
        <Small>{shortDate(fromKey(last.date))}</Small>
      </Row>
    </View>
  );
}
