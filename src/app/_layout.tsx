import { Outfit_500Medium, Outfit_700Bold, Outfit_800ExtraBold } from '@expo-google-fonts/outfit';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { syncReminders } from '../lib/notify';
import { useStore } from '../store';
import { c } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_500Medium, Outfit_700Bold, Outfit_800ExtraBold,
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
  });
  const hydrated = useStore((st) => st.hydrated);
  const ready = fontsLoaded && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useEffect(() => {
    if (!hydrated) return;
    const st = useStore.getState();
    // Keeps the training nudge pointing at the right session after each launch.
    if (st.profile && Object.values(st.reminders ?? {}).some(Boolean)) syncReminders(st.reminders, st.profile.weighInDay, st.plan?.days[st.nextDay]?.name);
  }, [hydrated]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="workout" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="scan" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="checkin" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
