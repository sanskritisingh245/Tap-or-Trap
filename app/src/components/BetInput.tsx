import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { fonts, palette, fs } from '../theme/ui';

interface BetInputProps {
  amount: string;
  onChangeAmount: (val: string) => void;
  balance: number;
  disabled?: boolean;
  accentColor?: string;
}

const QUICK_PICKS = [1, 5, 10, 25];

export function BetInput({ amount, onChangeAmount, balance, disabled, accentColor = palette.primary }: BetInputProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>BET</Text>
        <Text style={styles.balance}>{balance} credits</Text>
      </View>
      <View style={[styles.inputRow, { borderColor: accentColor }]}>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={onChangeAmount}
          keyboardType="number-pad"
          placeholderTextColor={palette.muted}
          placeholder="0"
          editable={!disabled}
        />
        <TouchableOpacity
          style={[styles.maxBtn, { backgroundColor: accentColor }]}
          onPress={() => onChangeAmount(String(balance))}
          disabled={disabled}
        >
          <Text style={styles.maxText}>MAX</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.quickRow}>
        {QUICK_PICKS.map(v => (
          <TouchableOpacity
            key={v}
            style={styles.quickBtn}
            onPress={() => onChangeAmount(String(v))}
            disabled={disabled}
          >
            <Text style={styles.quickText}>{v}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.quickBtn}
          onPress={() => {
            const n = parseInt(amount) || 0;
            onChangeAmount(String(Math.floor(n / 2)));
          }}
          disabled={disabled}
        >
          <Text style={styles.quickText}>½</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickBtn}
          onPress={() => {
            const n = parseInt(amount) || 0;
            onChangeAmount(String(n * 2));
          }}
          disabled={disabled}
        >
          <Text style={styles.quickText}>2x</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(11) },
  balance: { color: palette.primaryStrong, fontFamily: fonts.mono, fontSize: fs(11) },
  inputRow: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    backgroundColor: palette.panelSoft,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    color: palette.text,
    fontFamily: fonts.display,
    fontSize: fs(24),
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  maxBtn: {
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  maxText: { color: palette.buttonText, fontFamily: fonts.mono, fontSize: fs(12), fontWeight: '700' },
  quickRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  quickBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 0,
    backgroundColor: palette.panelSoft,
    paddingVertical: 7,
    alignItems: 'center',
  },
  quickText: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(12) },
});
