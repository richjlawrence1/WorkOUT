import { Image } from 'expo-image';
import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { mealImage } from '../data/mealImages';
import { c } from '../theme';

export function MealImage({ id, style }: { id: string; style?: StyleProp<ViewStyle> }) {
  const uri = mealImage(id);
  return (
    <View style={[{ backgroundColor: c.raised, overflow: 'hidden' }, style]}>
      {uri ? <Image source={{ uri }} style={{ flex: 1 }} contentFit="cover" transition={200} cachePolicy="disk" accessibilityIgnoresInvertColors /> : null}
    </View>
  );
}
