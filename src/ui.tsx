import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextStyle, View, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { c, f, radius, s } from './theme';

export type IconName = React.ComponentProps<typeof Feather>['name'];

export const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};
export const thud = () => {
  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};

export function Screen({
  children, scroll = true, pad = true, footer, top = true,
}: { children: React.ReactNode; scroll?: boolean; pad?: boolean; footer?: React.ReactNode; top?: boolean }) {
  const insets = useSafeAreaInsets();
  const padding = { paddingTop: (top ? insets.top : 0) + s.lg, paddingHorizontal: pad ? s.xl : 0 };
  return (
    <KeyboardAvoidingView style={st.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={st.column}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[padding, { paddingBottom: s.xxl * 2 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, padding]}>{children}</View>
        )}
        {footer ? <View style={[st.footer, { paddingBottom: Math.max(insets.bottom, s.lg) }]}>{footer}</View> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

/** Top bar for pushed screens. */
export function Header({ title, right, onBack }: { title?: string; right?: React.ReactNode; onBack?: () => void }) {
  return (
    <View style={st.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={12}
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        style={st.iconBtn}
      >
        <Feather name="chevron-left" size={22} color={c.cream} />
      </Pressable>
      <Text style={st.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export const Eyebrow = ({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => (
  <Text style={[st.eyebrow, style]}>{children}</Text>
);
export const Title = ({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => (
  <Text style={[st.title, style]}>{children}</Text>
);
export const H2 = ({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => (
  <Text style={[st.h2, style]}>{children}</Text>
);
export const Body = ({ children, style, muted, numberOfLines }: { children: React.ReactNode; style?: StyleProp<TextStyle>; muted?: boolean; numberOfLines?: number }) => (
  <Text numberOfLines={numberOfLines} style={[st.body, muted && { color: c.muted }, style]}>{children}</Text>
);
export const Small = ({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => (
  <Text style={[st.small, style]}>{children}</Text>
);

export const Rule = ({ style }: { style?: StyleProp<ViewStyle> }) => <View style={[st.rule, style]} />;

export function Card({ children, style, onPress, gold }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; gold?: boolean }) {
  const body = [st.card, gold && { borderColor: c.goldDim }, style];
  if (!onPress) return <View style={body}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [body, pressed && { opacity: 0.85 }]}
    >
      {children}
    </Pressable>
  );
}

export function Button({
  label, onPress, variant = 'gold', icon, disabled, style, small,
}: { label: string; onPress: () => void; variant?: 'gold' | 'ghost' | 'quiet'; icon?: IconName; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean }) {
  const fg = variant === 'gold' ? '#17130A' : variant === 'ghost' ? c.gold : c.muted;
  const inner = (
    <View style={[st.btnInner, small && { paddingVertical: 10, paddingHorizontal: s.lg }]}>
      {icon ? <Feather name={icon} size={small ? 14 : 16} color={fg} /> : null}
      <Text style={[st.btnText, { color: fg }, small && { fontSize: 12 }]}>{label}</Text>
    </View>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [st.btn, variant === 'ghost' && st.btnGhost, { opacity: disabled ? 0.35 : pressed ? 0.8 : 1 }, style]}
    >
      {variant === 'gold' ? (
        <LinearGradient colors={[c.goldBright, c.gold, '#B08F47']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.btnFill}>
          {inner}
        </LinearGradient>
      ) : inner}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress ? () => { tap(); onPress(); } : undefined}
      style={[st.chip, selected && st.chipOn]}
    >
      {icon ? <Feather name={icon} size={13} color={selected ? c.goldBright : c.muted} /> : null}
      <Text style={[st.chipText, selected && { color: c.goldBright }]}>{label}</Text>
    </Pressable>
  );
}

export const ChipRow = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: s.sm }, style]}>{children}</View>
);

/** Large tappable option used in onboarding. */
export function Option({ title, sub, selected, onPress, icon }: { title: string; sub?: string; selected?: boolean; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: !!selected }}
      onPress={() => { tap(); onPress(); }}
      style={[st.option, selected && st.optionOn]}
    >
      {icon ? <Feather name={icon} size={18} color={selected ? c.goldBright : c.muted} style={{ marginRight: s.md }} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={[st.optionTitle, selected && { color: c.cream }]}>{title}</Text>
        {sub ? <Text style={st.small}>{sub}</Text> : null}
      </View>
      <View style={[st.radio, selected && { borderColor: c.gold }]}>{selected ? <View style={st.radioDot} /> : null}</View>
    </Pressable>
  );
}

export function Field({
  label, value, onChangeText, suffix, numeric, placeholder, style, autoFocus,
}: { label?: string; value: string; onChangeText: (t: string) => void; suffix?: string; numeric?: boolean; placeholder?: string; style?: StyleProp<ViewStyle>; autoFocus?: boolean }) {
  return (
    <View style={style}>
      {label ? <Text style={st.fieldLabel}>{label}</Text> : null}
      <View style={st.field}>
        <TextInput
          accessibilityLabel={label ?? placeholder}
          value={value}
          onChangeText={onChangeText}
          keyboardType={numeric ? 'decimal-pad' : 'default'}
          inputMode={numeric ? 'decimal' : 'text'}
          placeholder={placeholder}
          placeholderTextColor={c.faint}
          selectionColor={c.gold}
          autoFocus={autoFocus}
          style={st.input}
        />
        {suffix ? <Text style={st.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

export function Stepper({ value, onChange, min, max, step = 1, suffix }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; suffix?: string }) {
  const btn = (delta: number, icon: IconName) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={delta > 0 ? 'Increase' : 'Decrease'}
      onPress={() => { tap(); onChange(Math.min(max, Math.max(min, value + delta))); }}
      style={st.stepBtn}
    >
      <Feather name={icon} size={18} color={c.gold} />
    </Pressable>
  );
  return (
    <View style={st.stepper}>
      {btn(-step, 'minus')}
      <Text style={st.stepValue}>
        {value}
        {suffix ? <Text style={st.stepSuffix}> {suffix}</Text> : null}
      </Text>
      {btn(step, 'plus')}
    </View>
  );
}

export function Ring({ size = 120, stroke = 8, progress, children, color = c.gold }: { size?: number; stroke?: number; progress: number; children?: React.ReactNode; color?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.line} strokeWidth={stroke} fill="none" />
        {p > 0 ? (
          <Circle
            cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
            strokeDasharray={`${circ * p} ${circ}`} strokeLinecap="round"
          />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}

export function Bar({ label, value, target, unit = 'g' }: { label: string; value: number; target: number; unit?: string }) {
  const p = target ? Math.min(1, value / target) : 0;
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={st.small}>{label}</Text>
        <Text style={[st.small, { color: c.text, fontVariant: ['tabular-nums'] }]}>
          {Math.round(value)}<Text style={{ color: c.faint }}>/{target}{unit}</Text>
        </Text>
      </View>
      <View style={st.track}><View style={[st.fill, { width: `${p * 100}%` }]} /></View>
    </View>
  );
}

export function Stat({ value, label, unit }: { value: string; label: string; unit?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={st.statValue}>
        {value}
        {unit ? <Text style={st.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={st.small}>{label}</Text>
    </View>
  );
}

export function IconButton({ icon, onPress, label, color = c.cream, size = 18 }: { icon: IconName; onPress: () => void; label: string; color?: string; size?: number }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={10} onPress={() => { tap(); onPress(); }} style={st.iconBtn}>
      <Feather name={icon} size={size} color={color} />
    </Pressable>
  );
}

export const Row = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>
);

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: 560 },
  footer: { paddingHorizontal: s.xl, paddingTop: s.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line, backgroundColor: c.bg },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: s.lg, marginLeft: -8 },
  headerTitle: { flex: 1, textAlign: 'center', color: c.cream, fontFamily: f.medium, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: c.gold, fontFamily: f.medium, fontSize: 11, letterSpacing: 2.4, textTransform: 'uppercase' },
  title: { color: c.cream, fontFamily: f.serif, fontSize: 38, lineHeight: 42, letterSpacing: -0.3, fontVariant: ['lining-nums'] },
  h2: { color: c.cream, fontFamily: f.serifSemi, fontSize: 24, lineHeight: 28, fontVariant: ['lining-nums'] },
  body: { color: c.text, fontFamily: f.sans, fontSize: 15, lineHeight: 22 },
  small: { color: c.muted, fontFamily: f.sans, fontSize: 12.5, lineHeight: 18 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginVertical: s.lg },
  card: { backgroundColor: c.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line, padding: s.lg },
  btn: { borderRadius: radius.pill, overflow: 'hidden' },
  btnGhost: { borderWidth: 1, borderColor: c.goldDim },
  btnFill: { borderRadius: radius.pill },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s.sm, paddingVertical: 16, paddingHorizontal: s.xl },
  btnText: { fontFamily: f.semi, fontSize: 13, letterSpacing: 1.6, textTransform: 'uppercase' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface },
  chipOn: { borderColor: c.gold, backgroundColor: c.goldWash },
  chipText: { color: c.muted, fontFamily: f.medium, fontSize: 13 },
  option: { flexDirection: 'row', alignItems: 'center', padding: s.lg, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, marginBottom: s.md },
  optionOn: { borderColor: c.gold, backgroundColor: c.goldWash },
  optionTitle: { color: c.text, fontFamily: f.medium, fontSize: 16, marginBottom: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: c.faint, alignItems: 'center', justifyContent: 'center', marginLeft: s.md },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.gold },
  fieldLabel: { color: c.muted, fontFamily: f.medium, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 8 },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: c.line, paddingHorizontal: s.lg },
  input: { flex: 1, minWidth: 0, color: c.cream, fontFamily: f.medium, fontSize: 17, paddingVertical: 14, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  suffix: { color: c.muted, fontFamily: f.sans, fontSize: 14, marginLeft: s.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, padding: s.sm },
  stepBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: c.raised },
  stepValue: { color: c.cream, fontFamily: f.serif, fontSize: 34, fontVariant: ['lining-nums', 'tabular-nums'] },
  stepSuffix: { color: c.muted, fontFamily: f.sans, fontSize: 14 },
  track: { height: 4, borderRadius: 2, backgroundColor: c.line, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: c.gold },
  statValue: { color: c.cream, fontFamily: f.serif, fontSize: 28, fontVariant: ['lining-nums', 'tabular-nums'] },
  statUnit: { color: c.muted, fontFamily: f.sans, fontSize: 13 },
});
