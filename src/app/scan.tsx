import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import { FoodSheet } from '../components/FoodSheet';
import { dayKey } from '../lib/dates';
import { lookupBarcode } from '../lib/off';
import { c, radius, s } from '../theme';
import type { Food, MealSlot } from '../types';
import { Body, Button, Card, Eyebrow, Field, Header, Row, Screen, Small, Title, thud } from '../ui';

type State =
  | { k: 'scanning' }
  | { k: 'loading'; code: string }
  | { k: 'found'; food: Food }
  | { k: 'missing'; code: string }
  | { k: 'error'; code: string };

export default function Scan() {
  const params = useLocalSearchParams<{ date?: string; slot?: MealSlot }>();
  const date = params.date ?? dayKey();
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<State>({ k: 'scanning' });
  const [manual, setManual] = useState('');
  const busy = useRef(false);

  const lookup = async (code: string) => {
    if (busy.current) return;
    busy.current = true;
    setState({ k: 'loading', code });
    try {
      const food = await lookupBarcode(code);
      if (food) thud();
      setState(food ? { k: 'found', food } : { k: 'missing', code });
    } catch {
      setState({ k: 'error', code });
    } finally {
      busy.current = false;
    }
  };

  const again = () => setState({ k: 'scanning' });
  const toSearch = () => router.replace({ pathname: '/add-food', params: { date, ...(params.slot ? { slot: params.slot } : {}) } });

  return (
    <Screen>
      <Header title="Scan" />
      {state.k === 'found' ? (
        <FoodSheet food={state.food} date={date} slot={params.slot} onCancel={again} onDone={() => router.back()} />
      ) : (
        <>
          <Title>Scan a barcode</Title>
          <Body muted style={{ marginTop: s.sm }}>Point the camera at the barcode on any packaged food.</Body>

          <View style={st.frame}>
            {permission?.granted && state.k === 'scanning' ? (
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
                onBarcodeScanned={({ data }) => lookup(data)}
              />
            ) : null}
            {permission?.granted && state.k === 'scanning' ? <View style={st.reticle} pointerEvents="none" /> : null}
            {state.k === 'loading' ? (
              <View style={st.center}>
                <ActivityIndicator color={c.gold} />
                <Small style={{ marginTop: s.sm }}>Looking up {state.code}</Small>
              </View>
            ) : null}
            {!permission?.granted && state.k === 'scanning' ? (
              <View style={[st.center, { padding: s.xl }]}>
                <Body style={{ textAlign: 'center', marginBottom: s.lg }}>
                  {permission && !permission.canAskAgain
                    ? 'Camera access is turned off for this app. Enable it in Settings to scan.'
                    : 'Camera access is needed to read barcodes.'}
                </Body>
                {permission && !permission.canAskAgain ? (
                  <Button label="Open settings" small variant="ghost" onPress={() => Linking.openSettings()} />
                ) : (
                  <Button label="Allow camera" small onPress={requestPermission} />
                )}
              </View>
            ) : null}
            {state.k === 'missing' || state.k === 'error' ? (
              <View style={[st.center, { padding: s.xl }]}>
                <Eyebrow>{state.k === 'missing' ? 'Not in the database' : 'Connection problem'}</Eyebrow>
                <Body style={{ textAlign: 'center', marginVertical: s.md }}>
                  {state.k === 'missing'
                    ? `No product found for ${state.code}. Search by name or enter the label values yourself.`
                    : "Couldn't reach the product database. Check your connection and try again."}
                </Body>
                <Row style={{ gap: s.sm }}>
                  <Button label={state.k === 'error' ? 'Retry' : 'Scan again'} small variant="ghost" onPress={state.k === 'error' ? () => lookup(state.code) : again} />
                  <Button label="Search instead" small onPress={toSearch} />
                </Row>
              </View>
            ) : null}
          </View>

          <Card style={{ marginTop: s.lg }}>
            <Eyebrow>Or type the barcode number</Eyebrow>
            <Row style={{ gap: s.md, marginTop: s.md }}>
              <Field value={manual} onChangeText={(t) => setManual(t.replace(/[^0-9]/g, ''))} numeric placeholder="e.g. 5000112637922" style={{ flex: 1 }} />
              <Button label="Look up" small disabled={manual.length < 8} onPress={() => lookup(manual)} />
            </Row>
          </Card>
          <Button label="Search by name instead" variant="quiet" icon="search" onPress={toSearch} style={{ marginTop: s.sm }} />
        </>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  frame: { marginTop: s.xl, aspectRatio: 1, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
  center: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  reticle: { position: 'absolute', left: '12%', right: '12%', top: '34%', bottom: '34%', borderWidth: 1.5, borderColor: c.gold, borderRadius: radius.sm },
});
