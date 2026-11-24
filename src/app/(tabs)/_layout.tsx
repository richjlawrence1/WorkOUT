import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { Redirect } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useStore } from '../../store';
import { c, f } from '../../theme';
import type { IconName } from '../../ui';

const icon = (name: IconName) => ({ color }: { color: unknown }) => <Feather name={name} size={20} color={color as string} />;

export default function TabsLayout() {
  const onboarded = useStore((st) => !!st.profile);
  if (!onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.bg },
        tabBarActiveTintColor: c.gold,
        tabBarInactiveTintColor: c.faint,
        tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.line, borderTopWidth: StyleSheet.hairlineWidth, height: 84, paddingTop: 8 },
        tabBarLabelStyle: { fontFamily: f.medium, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 2 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('sun') }} />
      <Tabs.Screen name="train" options={{ title: 'Train', tabBarIcon: icon('activity') }} />
      <Tabs.Screen name="nutrition" options={{ title: 'Nutrition', tabBarIcon: icon('coffee') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon('trending-up') }} />
    </Tabs>
  );
}
