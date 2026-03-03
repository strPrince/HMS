import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';

type NotificationToastProps = {
  message: string;
  tone?: 'info' | 'success' | 'danger';
};

export default function NotificationToast({ message, tone = 'info' }: NotificationToastProps) {
  const toneColor = tone === 'success' ? colors.success : tone === 'danger' ? colors.danger : colors.accent;

  return (
    <View style={[styles.container, { borderColor: toneColor }]}> 
      <View style={[styles.dot, { backgroundColor: toneColor }]} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: colors.surface
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8
  },
  text: {
    fontSize: 14,
    color: colors.text
  }
});
