import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, palette } from '../theme/ui';

interface BetInputProps {
  amount: string;
  onChangeAmount: (val: string) => void;
  balance: number;
  disabled?: boolean;
  accentColor?: string;
}

const QUICK_PICKS = [1, 5, 10, 25];

export function BetInput({ amount, onChangeAmount, balance, disabled, accentColor }: BetInputProps) {
  const resolvedAccent = accentColor ?? palette.primary;
  const [focused, setFocused] = useState(false);
  const bal = typeof balance === 'number' && !isNaN(balance) ? balance : 0;

  // Defensive wrapper — prevents crash if prop is somehow undefined at runtime
  const safeChange = (val: string) => {
    if (typeof onChangeAmount === 'function') {
      onChangeAmount(val);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Bet amount</Text>
        <Text style={styles.balance}>{bal} credits</Text>
      </View>
      <View style={[styles.inputRow, focused && { borderColor: resolvedAccent + '50', borderWidth: 1 }]}>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={(val) => {
            const cleaned = val.replace(/[^0-9]/g, '');
            safeChange(cleaned || '0');
          }}
          keyboardType="number-pad"
          placeholderTextColor="rgba(255,255,255,0.18)"
          placeholder="0"
          editable={!disabled}
          selectionColor={resolvedAccent}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <Pressable
          style={styles.maxWrap}
          onPress={() => bal > 0 && safeChange(String(bal))}
          disabled={disabled || bal < 1}
        >
          <LinearGradient
            colors={[resolvedAccent + '25', resolvedAccent + '10'] as [string, string]}
            style={styles.maxBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[styles.maxText, { color: resolvedAccent }]}>MAX</Text>
          </LinearGradient>
        </Pressable>
      </View>
      <View style={styles.quickRow}>
        {QUICK_PICKS.map(v => (
          <QuickBtn key={v} label={String(v)} onPress={() => safeChange(String(v))} disabled={disabled} accent={resolvedAccent} />
        ))}
        <QuickBtn
          label="1/2"
          onPress={() => { const n = parseInt(amount) || 0; safeChange(String(Math.max(0, Math.floor(n / 2)))); }}
          disabled={disabled}
          accent={resolvedAccent}
        />
        <QuickBtn
          label="2x"
          onPress={() => { const n = parseInt(amount) || 0; safeChange(String(n * 2)); }}
          disabled={disabled}
          accent={resolvedAccent}
        />
      </View>
    </View>
  );
}

function QuickBtn({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean; accent: string }) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      style={styles.quickBtn}
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, damping: 15, stiffness: 400 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 400 }).start()}
    >
      <Animated.View style={[styles.quickInner, { transform: [{ scale }] }]}>
        <Text style={styles.quickText}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: 'rgba(255,255,255,0.55)', fontFamily: fonts.body, fontSize: 13 },
  balance: { color: 'rgba(255,255,255,0.55)', fontFamily: fonts.mono, fontSize: 13 },
  inputRow: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: fonts.mono,
    fontSize: 28,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  maxWrap: { justifyContent: 'center', margin: 6 },
  maxBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  maxText: { fontFamily: fonts.body, fontSize: 13, fontWeight: '600' },
  quickRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  quickBtn: { flex: 1 },
  quickInner: {
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  quickText: { color: 'rgba(255,255,255,0.55)', fontFamily: fonts.mono, fontSize: 13 },
});
