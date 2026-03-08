import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, palette, shadows } from '../theme/ui';

export type AppDialogAction = {
  label: string;
  onPress: () => void;
  tone?: 'neutral' | 'danger';
};

interface AppDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  onClose: () => void;
  actions?: AppDialogAction[];
}

export function AppDialog({
  visible,
  title,
  message,
  onClose,
  actions = [{ label: 'OK', onPress: onClose }],
}: AppDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={[styles.actionsRow, actions.length > 1 && styles.actionsSplit]}>
            {actions.map((action, idx) => {
              if (action.tone === 'danger') {
                return (
                  <TouchableOpacity
                    key={`${action.label}-${idx}`}
                    style={[styles.actionWrap, actions.length > 1 && styles.actionHalf]}
                    onPress={action.onPress}
                    activeOpacity={0.88}
                  >
                    <View style={styles.dangerBtn}>
                      <Text style={styles.dangerText}>{action.label}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={`${action.label}-${idx}`}
                  style={[styles.actionWrap, actions.length > 1 && styles.actionHalf]}
                  onPress={action.onPress}
                  activeOpacity={0.88}
                >
                  <LinearGradient colors={['#2A355C', '#132144']} style={styles.primaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Text style={styles.primaryText}>{action.label}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 14, 26, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(151, 171, 205, 0.26)',
    backgroundColor: 'rgba(22, 34, 54, 0.96)',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    ...shadows.medium,
  },
  title: {
    color: '#F2DFC5',
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 30,
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    color: 'rgba(220,197,162,0.86)',
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
  },
  actionsRow: {
    marginTop: 16,
    gap: 8,
  },
  actionsSplit: {
    flexDirection: 'row',
  },
  actionWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionHalf: {
    flex: 1,
  },
  primaryBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(224,198,159,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  primaryText: {
    color: '#F3E2C8',
    fontFamily: fonts.display,
    fontSize: 18,
    lineHeight: 20,
  },
  dangerBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,90,122,0.45)',
    backgroundColor: 'rgba(255,90,122,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  dangerText: {
    color: '#F4A9B8',
    fontFamily: fonts.body,
    fontSize: 14,
  },
});
