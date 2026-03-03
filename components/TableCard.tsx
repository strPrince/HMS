import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import type { TableStatus } from '../types/restaurant';

type TableCardProps = {
  label: string;
  seats: number;
  status: TableStatus;
  onPress?: () => void;
};

const statusColor: Record<TableStatus, string> = {
  free: colors.muted,
  occupied: colors.primary,
  ready: colors.success
};

export default function TableCard({ label, seats, status, onPress }: TableCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.badge, { backgroundColor: statusColor[status] }]}>
          <Text style={styles.badgeText}>{status}</Text>
        </View>
      </View>
      <Text style={styles.seats}>{seats} seats</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textStrong
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999
  },
  badgeText: {
    fontSize: 11,
    color: colors.surface,
    textTransform: 'capitalize',
    fontWeight: '600'
  },
  seats: {
    marginTop: 8,
    color: colors.mutedDark
  }
});
