import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChatTurn, CoachError, askCoach, buildContext, getApiKey } from '../lib/coachChat';
import { c, f, radius, s } from '../theme';
import { Body, Button, Chip, ChipRow, Header, Screen, Small, Title, tap } from '../ui';

const STARTERS = [
  "Why isn't my weight changing?",
  'What should I focus on this week?',
  'Is my protein high enough?',
  'Why did my weights change today?',
];

export default function Coach() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One data snapshot per conversation, so follow-ups stay consistent and cached.
  const context = useRef(buildContext()).current;
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    getApiKey().then((k) => setHasKey(!!k)).catch(() => setHasKey(false));
  }, []);

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    tap();
    const next: ChatTurn[] = [...turns, { role: 'user', text: question }];
    setTurns(next);
    setText('');
    setError(null);
    setBusy(true);
    try {
      const answer = await askCoach(next, context);
      setTurns([...next, { role: 'assistant', text: answer }]);
    } catch (e) {
      setError(e instanceof CoachError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    }
  };
  const retry = () => {
    const last = turns[turns.length - 1];
    if (last?.role !== 'user') return;
    const prior = turns.slice(0, -1);
    setTurns(prior);
    setTimeout(() => send(last.text), 0);
  };

  if (hasKey === false) {
    return (
      <Screen>
        <Header title="Coach" />
        <Title>Talk to your coach</Title>
        <Body muted style={{ marginTop: s.md }}>
          Ask why your weight isn't moving, what to change this week, or how to work around a busy day. Answers come from your own training, food and weigh-in history.
        </Body>
        <Body muted style={{ marginTop: s.md }}>
          This uses Claude and needs your own Anthropic API key, which is stored only in this phone's secure keychain. Each question costs a few pence of API credit.
        </Body>
        <Button label="Add API key in Settings" style={{ marginTop: s.xl }} onPress={() => router.replace('/settings')} />
      </Screen>
    );
  }

  return (
    <Screen
      scroll={false}
      footer={
        <View>
          {error ? (
            <Pressable accessibilityRole="button" onPress={retry} style={{ marginBottom: s.sm }}>
              <Small style={{ color: c.bad }}>{error} Tap to retry.</Small>
            </Pressable>
          ) : null}
          <View style={st.inputRow}>
            <TextInput
              accessibilityLabel="Message your coach"
              value={text}
              onChangeText={setText}
              placeholder="Ask your coach"
              placeholderTextColor={c.faint}
              selectionColor={c.gold}
              multiline
              style={st.input}
              onSubmitEditing={() => send(text)}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Send" disabled={busy || !text.trim()} onPress={() => send(text)} style={[st.send, (busy || !text.trim()) && { opacity: 0.4 }]}>
              <Feather name="arrow-up" size={18} color="#17130A" />
            </Pressable>
          </View>
        </View>
      }
    >
      <Header title="Coach" />
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: s.lg }}>
        {!turns.length ? (
          <View>
            <Title>What's on your mind?</Title>
            <Small style={{ marginTop: s.sm, marginBottom: s.lg }}>I can see your programme, recent sessions, food diary, weigh-ins and check-ins.</Small>
            <ChipRow>{STARTERS.map((q) => <Chip key={q} label={q} onPress={() => send(q)} />)}</ChipRow>
          </View>
        ) : null}
        {turns.map((m, i) => (
          <View key={i} style={[st.bubble, m.role === 'user' ? st.user : st.coach]}>
            <Text style={[st.msg, m.role === 'user' && { color: c.cream }]} selectable>{m.text}</Text>
          </View>
        ))}
        {busy ? (
          <View style={[st.bubble, st.coach, { flexDirection: 'row', gap: s.sm, alignItems: 'center' }]}>
            <ActivityIndicator size="small" color={c.gold} />
            <Small>Looking at your numbers</Small>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const st = StyleSheet.create({
  bubble: { maxWidth: '88%', padding: s.md, borderRadius: radius.md, marginTop: s.md },
  user: { alignSelf: 'flex-end', backgroundColor: c.raised, borderBottomRightRadius: 4 },
  coach: { alignSelf: 'flex-start', backgroundColor: c.goldWash, borderWidth: StyleSheet.hairlineWidth, borderColor: c.goldDim, borderBottomLeftRadius: 4 },
  msg: { color: c.text, fontFamily: f.sans, fontSize: 15, lineHeight: 22 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: s.sm },
  input: { flex: 1, minWidth: 0, maxHeight: 120, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, color: c.cream, fontFamily: f.sans, fontSize: 16, paddingHorizontal: s.lg, paddingTop: 12, paddingBottom: 12 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.gold, alignItems: 'center', justifyContent: 'center' },
});
