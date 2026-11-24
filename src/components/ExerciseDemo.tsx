import { Image } from 'expo-image';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { EXERCISE_IMAGES } from '../data/exercises';
import { c, radius } from '../theme';

/**
 * Looping demonstration: cross-fades between the start and end position of
 * the movement so the full rep reads as motion.
 */
export function ExerciseDemo({ id, style, animate = true, rounded = true }: { id: string; style?: StyleProp<ViewStyle>; animate?: boolean; rounded?: boolean }) {
  const fade = useRef(new Animated.Value(0)).current;
  const imgs = EXERCISE_IMAGES[id];

  useEffect(() => {
    if (!animate) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(fade, { toValue: 1, duration: 550, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(700),
        Animated.timing(fade, { toValue: 0, duration: 550, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animate, fade]);

  if (!imgs) return <View style={[st.box, rounded && st.rounded, style]} />;
  return (
    <View style={[st.box, rounded && st.rounded, style]} accessibilityRole="image" accessibilityLabel="Exercise demonstration">
      <Image source={imgs[0]} style={StyleSheet.absoluteFill} contentFit="cover" />
      {animate ? (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
          <Image source={imgs[1]} style={StyleSheet.absoluteFill} contentFit="cover" />
        </Animated.View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  box: { backgroundColor: c.raised, overflow: 'hidden', aspectRatio: 3 / 2 },
  rounded: { borderRadius: radius.md },
});
