import React from 'react';
import { View } from 'react-native';
import { EQUIPMENT, EQUIPMENT_PRESETS } from '../lib/plan';
import { s } from '../theme';
import { Chip, ChipRow, Eyebrow } from '../ui';

const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

export function EquipmentPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (k: string) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  return (
    <View>
      <Eyebrow style={{ marginTop: s.xl, marginBottom: s.md }}>Quick select</Eyebrow>
      <ChipRow>
        {Object.entries(EQUIPMENT_PRESETS).map(([label, items]) => (
          <Chip key={label} label={label} selected={same(value, items)} onPress={() => onChange(items)} />
        ))}
      </ChipRow>
      {EQUIPMENT.map((g) => (
        <View key={g.group}>
          <Eyebrow style={{ marginTop: s.xl, marginBottom: s.md }}>{g.group}</Eyebrow>
          <ChipRow>
            {g.items.map(([k, label]) => (
              <Chip key={k} label={label} selected={value.includes(k)} onPress={() => toggle(k)} icon={value.includes(k) ? 'check' : undefined} />
            ))}
          </ChipRow>
        </View>
      ))}
    </View>
  );
}
