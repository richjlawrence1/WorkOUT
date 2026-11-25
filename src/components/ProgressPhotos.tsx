import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { dayKey, fromKey, shortDate } from '../lib/dates';
import { ANGLES, Angle, photoUri, pickPhoto } from '../lib/photos';
import { useStore } from '../store';
import { c, radius, s } from '../theme';
import type { PhotoSet } from '../types';
import { Body, Button, Chip, ChipRow, Row, Small, tap } from '../ui';

/** Three slots (front, side, back) for today's photos. */
export function PhotoCapture() {
  const photos = useStore((st) => st.photos);
  const setPhoto = useStore((st) => st.setPhoto);
  const today = photos.find((p) => p.date === dayKey());
  const [choosing, setChoosing] = useState<Angle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const take = async (angle: Angle, source: 'camera' | 'library') => {
    setError(null);
    const res = await pickPhoto(source);
    if (res && 'error' in res) setError(res.error);
    else if (res) setPhoto(dayKey(), angle, res.ref);
    setChoosing(null);
  };

  return (
    <View>
      <Row style={{ gap: s.sm }}>
        {ANGLES.map(([angle, label]) => {
          const ref = today?.[angle];
          return (
            <Pressable
              key={angle}
              accessibilityRole="button"
              accessibilityLabel={`${ref ? 'Retake' : 'Add'} ${label.toLowerCase()} photo`}
              onPress={() => { tap(); setChoosing(choosing === angle ? null : angle); }}
              style={[st.slot, choosing === angle && { borderColor: c.gold }]}
            >
              {ref ? <Image source={{ uri: photoUri(ref) }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Feather name="camera" size={20} color={c.faint} />}
              <View style={st.slotLabel}><Small style={{ color: ref ? c.cream : c.muted }}>{label}</Small></View>
            </Pressable>
          );
        })}
      </Row>
      {choosing ? (
        <Row style={{ gap: s.sm, marginTop: s.md }}>
          <Button label="Take photo" icon="camera" small style={{ flex: 1 }} onPress={() => take(choosing, 'camera')} />
          <Button label="From library" icon="image" small variant="ghost" style={{ flex: 1 }} onPress={() => take(choosing, 'library')} />
        </Row>
      ) : null}
      {error ? <Small style={{ color: c.bad, marginTop: s.sm }}>{error}</Small> : null}
    </View>
  );
}

const has = (p: PhotoSet, a: Angle) => !!p[a];

/** Start versus latest, side by side, for one angle at a time. */
export function PhotoCompare() {
  const photos = useStore((st) => st.photos);
  const [angle, setAngle] = useState<Angle>('front');
  const withAngle = photos.filter((p) => has(p, angle));
  const first = withAngle[0];
  const latest = withAngle[withAngle.length - 1];

  if (!photos.some((p) => p.front || p.side || p.back)) return null;

  const pane = (p: PhotoSet | undefined, label: string) => (
    <View style={{ flex: 1 }}>
      <View style={st.pane}>
        {p ? <Image source={{ uri: photoUri(p[angle] as string) }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Feather name="image" size={22} color={c.faint} />}
      </View>
      <Small style={{ marginTop: 6, color: c.gold }}>{label}</Small>
      <Small>{p ? shortDate(fromKey(p.date)) : 'Not taken yet'}</Small>
    </View>
  );

  return (
    <View>
      <ChipRow style={{ marginBottom: s.md }}>
        {ANGLES.map(([a, label]) => <Chip key={a} label={label} selected={a === angle} onPress={() => setAngle(a)} />)}
      </ChipRow>
      {first ? (
        <Row style={{ gap: s.sm, alignItems: 'flex-start' }}>
          {pane(first, 'Start')}
          {pane(latest && latest.date !== first.date ? latest : undefined, 'Now')}
        </Row>
      ) : (
        <Body muted>No {angle} photo yet.</Body>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  slot: { flex: 1, aspectRatio: 3 / 4, borderRadius: radius.sm, borderWidth: 1, borderColor: c.line, backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  slotLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 5, alignItems: 'center', backgroundColor: 'rgba(10,10,11,0.6)' },
  pane: { aspectRatio: 3 / 4, borderRadius: radius.sm, backgroundColor: c.raised, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
