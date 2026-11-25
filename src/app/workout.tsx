import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ExerciseDemo } from '../components/ExerciseDemo';
import { EX } from '../lib/plan';
import { sessionPRs, sessionVolume, setFeedback } from '../lib/progression';
import { useStore } from '../store';
import { c, f, radius, s } from '../theme';
import type { Session, SessionEntry, SetLog } from '../types';
import { Body, Button, Card, Eyebrow, IconButton, Row, Rule, Screen, Small, Stat, Title, tap, thud } from '../ui';

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

const useNow = () => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
};

// Screens here are always pushed over the tabs, so going back returns to them.
const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

export default function Workout() {
  const { active, sessions, updateActive, finishWorkout, discardWorkout } = useStore();
  const now = useNow();
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<'discard' | 'finish' | null>(null);
  const [cue, setCue] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ sn: Session; prs: { exId: string; e1rm: number }[] } | null>(null);

  if (summary) return <Summary {...summary} />;
  if (!active) {
    return (
      <Screen>
        <Title>No session in progress</Title>
        <Button label="Back to today" style={{ marginTop: s.xl }} onPress={() => leave()} />
      </Screen>
    );
  }

  const entries = active.entries;
  const patch = (ei: number, fn: (e: SessionEntry) => SessionEntry) => updateActive(entries.map((e, i) => (i === ei ? fn(e) : e)));
  const patchSet = (ei: number, si: number, p: Partial<SetLog>) =>
    patch(ei, (e) => ({ ...e, sets: e.sets.map((x, i) => (i === si ? { ...x, ...p } : x)) }));

  const doneCount = entries.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0);
  const total = entries.reduce((n, e) => n + e.sets.length, 0);
  const currentIdx = entries.findIndex((e) => e.sets.some((x) => !x.done));
  const rest = restEnd ? Math.max(0, Math.round((restEnd - now) / 1000)) : 0;

  const toggle = (ei: number, si: number) => {
    const set = entries[ei].sets[si];
    const ex = EX[entries[ei].exId];
    if (!set.done) {
      if (set.reps == null) return;
      thud();
      const after = { ...entries[ei], sets: entries[ei].sets.map((x, i) => (i === si ? { ...x, done: true } : x)) };
      setCue(`${ex?.name}: ${setFeedback(after, si)}`);
      // Carry the logged weight forward to the remaining sets of this exercise.
      patch(ei, (e) => ({
        ...e,
        sets: e.sets.map((x, i) => (i === si ? { ...x, done: true } : i > si && !x.done ? { ...x, kg: set.kg } : x)),
      }));
      setRestEnd(Date.now() + (ex?.compound ? 120 : 75) * 1000);
    } else {
      patchSet(ei, si, { done: false });
    }
  };

  const finish = () => {
    const before = sessions;
    const sn = finishWorkout();
    if (!sn) return leave();
    setSummary({ sn, prs: sessionPRs(before, sn) });
  };

  return (
    <Screen
      footer={
        confirm ? (
          <View>
            <Body style={{ textAlign: 'center', marginBottom: s.md }}>
              {confirm === 'discard' ? 'Discard this session? Nothing will be saved.' : `${total - doneCount} sets still open. Finish anyway?`}
            </Body>
            <Row style={{ gap: s.md }}>
              <Button label="Keep going" variant="ghost" style={{ flex: 1 }} onPress={() => setConfirm(null)} />
              <Button
                label={confirm === 'discard' ? 'Discard' : 'Finish'}
                style={{ flex: 1 }}
                onPress={() => {
                  if (confirm === 'finish') return finish();
                  discardWorkout();
                  leave();
                }}
              />
            </Row>
          </View>
        ) : (
          <View>
          {cue ? (
            <Row style={{ alignItems: 'flex-start', gap: s.sm, marginBottom: s.md }}>
              <CoachMark />
              <Small style={{ flex: 1, color: c.text }}>{cue}</Small>
            </Row>
          ) : null}
          <Row style={{ gap: s.md }}>
            {rest > 0 ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Skip rest" style={st.rest} onPress={() => setRestEnd(null)}>
                <Small>Rest</Small>
                <Text style={st.restTime}>{clock(rest)}</Text>
              </Pressable>
            ) : null}
            <Button
              label={doneCount === total ? 'Finish session' : `Finish · ${doneCount}/${total} sets`}
              variant={doneCount === total ? 'gold' : 'ghost'}
              style={{ flex: 1 }}
              disabled={doneCount === 0}
              onPress={() => (doneCount === total ? finish() : setConfirm('finish'))}
            />
          </Row>
          </View>
        )
      }
    >
      <Row style={{ justifyContent: 'space-between', marginLeft: -8 }}>
        <IconButton icon="chevron-down" label="Minimise session" onPress={() => router.back()} />
        <Text style={st.timer}>{clock((now - new Date(active.startedAt).getTime()) / 1000)}</Text>
        <IconButton icon="x" label="Discard session" color={c.muted} onPress={() => setConfirm('discard')} />
      </Row>
      <Eyebrow style={{ marginTop: s.md }}>In session</Eyebrow>
      <Title>{active.dayName}</Title>
      <View style={st.track}><View style={[st.fill, { width: `${(doneCount / Math.max(1, total)) * 100}%` }]} /></View>

      {entries.map((e, ei) => {
        const ex = EX[e.exId];
        const isCurrent = ei === currentIdx;
        const allDone = e.sets.every((x) => x.done);
        return (
          <Card key={e.exId + ei} gold={isCurrent} style={{ marginTop: s.md, padding: s.md, opacity: allDone ? 0.6 : 1 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`How to do ${ex.name}`} onPress={() => router.push(`/exercise/${ex.id}`)}>
              {isCurrent ? <ExerciseDemo id={ex.id} style={{ marginBottom: s.md, aspectRatio: 16 / 9 }} /> : null}
              <Row>
                {!isCurrent ? <ExerciseDemo id={ex.id} animate={false} style={st.thumb} /> : null}
                <View style={{ flex: 1 }}>
                  <Body style={{ fontFamily: f.medium }}>{ex.name}</Body>
                  <Small>{e.sets.length} × {e.repMin}-{e.repMax} {ex.timed ? 'sec' : 'reps'}</Small>
                </View>
                <Feather name="info" size={16} color={c.faint} />
              </Row>
            </Pressable>
            {isCurrent && e.note ? <CoachCard entry={e} /> : null}

            {(isCurrent || allDone || e.sets.some((x) => x.done)) && (
              <View style={{ marginTop: s.md }}>
                <Row style={{ marginBottom: 6 }}>
                  <Small style={st.colNum}>Set</Small>
                  <Small style={st.colIn}>{ex.bodyweight ? '+ kg' : 'kg'}</Small>
                  <Small style={st.colIn}>{ex.timed ? 'Sec' : 'Reps'}</Small>
                  <View style={{ width: 44 }} />
                </Row>
                {e.sets.map((set, si) => (
                  <Row key={si} style={{ marginBottom: s.sm }}>
                    <Text style={[st.colNum, st.setNum]}>{si + 1}</Text>
                    <NumInput label={`Set ${si + 1} weight`} value={set.kg} onChange={(kg) => patchSet(ei, si, { kg })} done={set.done} placeholder={ex.bodyweight ? '0' : ''} />
                    <NumInput label={`Set ${si + 1} reps`} value={set.reps} onChange={(reps) => patchSet(ei, si, { reps })} done={set.done} integer />
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityLabel={`Complete set ${si + 1}`}
                      accessibilityState={{ checked: set.done }}
                      onPress={() => toggle(ei, si)}
                      style={[st.check, set.done && st.checkOn]}
                    >
                      <Feather name="check" size={18} color={set.done ? '#17130A' : c.faint} />
                    </Pressable>
                  </Row>
                ))}
                <Row style={{ gap: s.lg }}>
                  <Pressable accessibilityRole="button" onPress={() => { tap(); patch(ei, (x) => ({ ...x, sets: [...x.sets, { ...x.sets[x.sets.length - 1], done: false }] })); }}>
                    <Small style={{ color: c.gold }}>+ Add set</Small>
                  </Pressable>
                  {e.sets.length > 1 && !e.sets[e.sets.length - 1].done ? (
                    <Pressable accessibilityRole="button" onPress={() => { tap(); patch(ei, (x) => ({ ...x, sets: x.sets.slice(0, -1) })); }}>
                      <Small>Remove set</Small>
                    </Pressable>
                  ) : null}
                </Row>
              </View>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}

function CoachMark() {
  return (
    <View style={st.coachMark} accessibilityLabel="Coach">
      <Feather name="zap" size={11} color="#17130A" />
    </View>
  );
}

/** The coach's briefing for the current exercise: the call, the reason, last time, and the goal. */
function CoachCard({ entry }: { entry: SessionEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={st.coach}>
      <Row style={{ gap: s.sm }}>
        <CoachMark />
        <Eyebrow>Coach</Eyebrow>
      </Row>
      <Text style={st.note}>{entry.note}</Text>
      {entry.last ? <Small style={{ marginTop: 4 }}>{entry.last}</Small> : null}
      {entry.why ? <Body style={{ marginTop: s.sm, fontSize: 14, lineHeight: 20 }}>{entry.why}</Body> : null}
      {entry.goal ? (
        <Pressable accessibilityRole="button" onPress={() => { tap(); setOpen(!open); }} style={{ marginTop: s.sm }}>
          <Small style={{ color: c.gold }}>{open ? 'Hide the goal' : "What's the goal?"}</Small>
          {open ? <Small style={{ marginTop: 4, color: c.text }}>{entry.goal}</Small> : null}
        </Pressable>
      ) : null}
    </View>
  );
}

function NumInput({ value, onChange, done, integer, label, placeholder }: { value: number | null; onChange: (v: number | null) => void; done: boolean; integer?: boolean; label: string; placeholder?: string }) {
  const [text, setText] = useState(value == null ? '' : String(value));
  useEffect(() => {
    // Keep in sync when the store changes the value (e.g. weight carried forward).
    if ((value == null ? '' : String(value)) !== text && parseFloat(text.replace(',', '.')) !== value) setText(value == null ? '' : String(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={st.colIn}>
      <TextInput
        accessibilityLabel={label}
        value={text}
        editable={!done}
        keyboardType={integer ? 'number-pad' : 'decimal-pad'}
        inputMode={integer ? 'numeric' : 'decimal'}
        placeholder={placeholder ?? '–'}
        placeholderTextColor={c.faint}
        selectionColor={c.gold}
        selectTextOnFocus
        onChangeText={(t) => {
          setText(t);
          const v = parseFloat(t.replace(',', '.'));
          onChange(Number.isFinite(v) && v >= 0 ? (integer ? Math.round(v) : v) : null);
        }}
        style={[st.input, done && { color: c.gold, borderColor: 'transparent' }]}
      />
    </View>
  );
}

function Summary({ sn, prs }: { sn: Session; prs: { exId: string; e1rm: number }[] }) {
  const sets = sn.entries.reduce((n, e) => n + e.sets.length, 0);
  return (
    <Screen footer={<Button label="Done" onPress={() => leave()} />}>
      <View style={{ paddingTop: s.xxl }}>
        <Eyebrow>Session complete</Eyebrow>
        <Title style={{ marginTop: s.sm }}>{sn.dayName},{'\n'}done.</Title>
      </View>
      <Card style={{ marginTop: s.xl }}>
        <Row>
          <Stat value={String(Math.max(1, Math.round(sn.durationSec / 60)))} unit="min" label="Duration" />
          <Stat value={String(sets)} label="Sets" />
          <Stat value={Math.round(sessionVolume(sn)).toLocaleString()} unit="kg" label="Volume" />
        </Row>
      </Card>
      {prs.length ? (
        <Card gold style={{ marginTop: s.md }}>
          <Eyebrow>Personal records</Eyebrow>
          {prs.map((p) => (
            <Row key={p.exId} style={{ justifyContent: 'space-between', paddingTop: s.md }}>
              <Body>{EX[p.exId]?.name}</Body>
              <Small style={{ color: c.gold }}>est. 1RM {p.e1rm.toFixed(1)} kg</Small>
            </Row>
          ))}
        </Card>
      ) : null}
      <Card style={{ marginTop: s.md }}>
        <Eyebrow>What you lifted</Eyebrow>
        {sn.entries.map((e, i) => (
          <View key={i}>
            {i ? <Rule style={{ marginVertical: s.md }} /> : <View style={{ height: s.md }} />}
            <Body>{EX[e.exId]?.name}</Body>
            <Small>{e.sets.map((x) => (x.kg ? `${x.kg} kg × ${x.reps}` : `${x.reps}`)).join('   ')}</Small>
          </View>
        ))}
      </Card>
      <Body muted style={{ marginTop: s.lg }}>Your next session's targets have been updated from today's numbers.</Body>
    </Screen>
  );
}

const st = StyleSheet.create({
  timer: { color: c.cream, fontFamily: f.medium, fontSize: 15, letterSpacing: 1, fontVariant: ['tabular-nums'] },
  track: { height: 2, borderRadius: 1, backgroundColor: c.line, marginTop: s.lg, overflow: 'hidden' },
  fill: { height: 2, backgroundColor: c.gold },
  thumb: { width: 48, aspectRatio: 1, borderRadius: radius.sm, marginRight: s.md },
  note: { color: c.cream, fontFamily: f.serif, fontSize: 18, lineHeight: 23, letterSpacing: -0.3, marginTop: s.sm },
  coach: { marginTop: s.md, padding: s.md, borderRadius: radius.sm, backgroundColor: c.goldWash, borderWidth: StyleSheet.hairlineWidth, borderColor: c.goldDim },
  coachMark: { width: 20, height: 20, borderRadius: 10, backgroundColor: c.gold, alignItems: 'center', justifyContent: 'center' },
  colNum: { width: 36 },
  colIn: { flex: 1, marginRight: s.sm },
  setNum: { color: c.muted, fontFamily: f.medium, fontSize: 15 },
  input: { backgroundColor: c.raised, borderWidth: 1, borderColor: c.line, borderRadius: radius.sm, color: c.cream, fontFamily: f.medium, fontSize: 17, textAlign: 'center', paddingVertical: 11, minWidth: 0, fontVariant: ['tabular-nums'] },
  check: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: c.gold, borderColor: c.gold },
  rest: { alignItems: 'center', paddingHorizontal: s.md },
  restTime: { color: c.gold, fontFamily: f.serif, fontSize: 20, lineHeight: 24, fontVariant: ['tabular-nums'] },
});
