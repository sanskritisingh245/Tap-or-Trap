import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

interface RoomJoinerProps {
  onJoin: (code: string) => void;
  onCancel: () => void;
  error?: string | null;
  loading?: boolean;
}

export function RoomJoiner({ onJoin, onCancel, error, loading }: RoomJoinerProps) {
  const [code, setCode] = useState('');

  const handleSubmit = () => {
    if (code.length === 6) {
      onJoin(code.toUpperCase());
    }
  };

  const isReady = code.length === 6;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔑</Text>
      <Text style={styles.title}>Enter Invite Code</Text>
      <Text style={styles.subtitle}>Get the 6-character code from your friend</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, isReady && styles.inputReady]}
          value={code}
          onChangeText={(text) => setCode(text.toUpperCase().slice(0, 6))}
          placeholder="------"
          placeholderTextColor="#2A2A4A"
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
        />
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.joinBtn, !isReady && styles.joinBtnDisabled]}
        onPress={handleSubmit}
        disabled={!isReady || loading}
        activeOpacity={0.8}
      >
        <Text style={[styles.joinText, !isReady && styles.joinTextDisabled]}>
          {loading ? 'Joining...' : '⚔️ Join Duel'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B1A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#7B7BA0',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 32,
  },
  inputContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 32,
    fontSize: 36,
    fontWeight: '900',
    color: '#14F195',
    letterSpacing: 10,
    textAlign: 'center',
    width: '100%',
    fontFamily: 'monospace',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inputReady: {
    borderColor: 'rgba(20, 241, 149, 0.4)',
    backgroundColor: 'rgba(20, 241, 149, 0.06)',
  },
  errorBox: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.2)',
  },
  errorText: {
    color: '#FF6666',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  joinBtn: {
    backgroundColor: '#14F195',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    marginTop: 24,
    shadowColor: '#14F195',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  joinBtnDisabled: {
    backgroundColor: '#1E1E3A',
    shadowOpacity: 0,
    elevation: 0,
  },
  joinText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '800',
  },
  joinTextDisabled: {
    color: '#4A4A6A',
  },
  cancelBtn: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.4)',
  },
  cancelText: {
    color: '#FF6666',
    fontSize: 16,
    fontWeight: '600',
  },
});
