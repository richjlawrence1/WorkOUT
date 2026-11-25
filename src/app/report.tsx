import { Image } from 'expo-image';
import * as Sharing from 'expo-sharing';
import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { windowAvg } from '../lib/checkin';
import { addDays, shortDate } from '../lib/dates';
import { liftTrends, weekNutrition } from '../lib/insights';
import { photoUri } from '../lib/photos';
import { sessionVolume } from '../lib/progression';
import { deltaParts, fmtBody } from '../lib/units';
import { selectTargets, selectWeight, useStore } from '../store';
import { APP_NAME, c, f, radius, s } from '../theme';
import { Body, Button, Chip, ChipRow, Header, Screen, Small } from '../ui';

export default function Report() {
  const st0 = useStore();
  const { profile, sessions, weights, diary, photos } = st0;
  const shot = useRef<React.ComponentRef<typeof ViewShot>>(null);
  const [withPhotos, setWithPhotos] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (!profile) return null;

  const u = profile.units ?? 'kg';
  const t = selectTargets(st0)!;
  const since = addDays(new Date(), -7);
  const week = sessions.filter((sn) => new Date(sn.date) > since);
  const volume = Math.round(week.reduce((v, sn) => v + sessionVolume(sn), 0));
  const now = windowAvg(weights, 0), before = windowAvg(weights, 7);
  const change = now != null && before != null ? deltaParts(now - before, u) : null;
  const total = deltaParts(selectWeight(st0) - profile.startWeightKg, u);
  const lifts = liftTrends(sessions);
  const food = weekNutrition(diary, t);
  const front = photos.filter((p) => p.front);
  const first = front[0], latest = front[front.length - 1];
  const canCompare = !!first && !!latest && first.date !== latest.date;

  const share = async () => {
    setMsg(null);
    try {
      if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) return setMsg('Sharing works on your phone. Take a screenshot here instead.');
      const uri = await shot.current?.capture?.();
      if (!uri) return setMsg("Couldn't create the image. Try again.");
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your week' });
    } catch {
      setMsg("Couldn't share the report. Try again.");
    }
  };

  const stat = (value: string, label: string) => (
    <View style={{ flex: 1 }}>
      <Text style={st.value}>{value}</Text>
      <Text style={st.label}>{label}</Text>
    </View>
  );

  return (
    <Screen footer={<Button label="Share report" icon="share" onPress={share} />}>
      <Header title="Weekly report" />
      {canCompare ? (
        <ChipRow style={{ marginBottom: s.md }}>
          <Chip label="Stats only" selected={!withPhotos} onPress={() => setWithPhotos(false)} />
          <Chip label="Include front photos" selected={withPhotos} onPress={() => setWithPhotos(true)} />
        </ChipRow>
      ) : null}

      <ViewShot ref={shot} options={{ format: 'png', quality: 1 }}>
        <View style={st.card} collapsable={false}>
          <Text style={st.brand}>{APP_NAME}</Text>
          <Text style={st.week}>{shortDate(addDays(new Date(), -6))} to {shortDate(new Date())}</Text>
          <Text style={st.headline}>{week.length} of {profile.daysPerWeek} sessions{'\n'}{volume.toLocaleString()} kg lifted</Text>

          <View style={st.rule} />
          <View style={{ flexDirection: 'row' }}>
            {stat(change ? `${change.value} ${change.unit}` : '–', 'This week')}
            {stat(`${total.value} ${total.unit}`, 'Since start')}
            {stat(fmtBody(selectWeight(st0), u), 'Now')}
          </View>
          <View style={st.rule} />
          <View style={{ flexDirection: 'row' }}>
            {stat(String(lifts.up.length), 'Lifts up')}
            {stat(food.avgProtein != null ? `${food.avgProtein} g` : '–', 'Avg protein')}
            {stat(food.avgKcal != null ? String(food.avgKcal) : '–', 'Avg kcal')}
          </View>
          {lifts.up.length ? <Text style={st.lifts}>Up this week: {lifts.up.slice(0, 4).join(', ')}</Text> : null}

          {withPhotos && canCompare ? (
            <View style={{ flexDirection: 'row', gap: s.sm, marginTop: s.lg }}>
              {[first, latest].map((p, i) => (
                <View key={i} style={{ flex: 1 }}>
                  <View style={st.photo}><Image source={{ uri: photoUri(p.front as string) }} style={StyleSheet.absoluteFill} contentFit="cover" /></View>
                  <Text style={st.label}>{i === 0 ? 'Start' : 'Now'}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ViewShot>

      {msg ? <Small style={{ color: c.bad, marginTop: s.md }}>{msg}</Small> : null}
      <Body muted style={{ marginTop: s.lg }}>Sharing sends this card as an image through your phone's share sheet. Photos are only included if you choose them above.</Body>
    </Screen>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: c.bg, borderRadius: radius.lg, borderWidth: 1, borderColor: c.goldDim, padding: s.xl },
  brand: { color: c.gold, fontFamily: f.heavy, fontSize: 18, letterSpacing: -0.5 },
  week: { color: c.muted, fontFamily: f.medium, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 },
  headline: { color: c.cream, fontFamily: f.heavy, fontSize: 30, lineHeight: 34, letterSpacing: -1, marginTop: s.lg },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginVertical: s.lg },
  value: { color: c.cream, fontFamily: f.serif, fontSize: 20, letterSpacing: -0.4 },
  label: { color: c.muted, fontFamily: f.sans, fontSize: 12, marginTop: 2 },
  lifts: { color: c.text, fontFamily: f.sans, fontSize: 13, lineHeight: 19, marginTop: s.lg },
  photo: { aspectRatio: 3 / 4, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: c.raised, marginBottom: 6 },
});
