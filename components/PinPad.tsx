import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';

type PinPadProps = {
  onDigitPress?: (digit: string) => void;
  onClear?: () => void;
};

const digits = ['1','2','3','4','5','6','7','8','9','0'];

export default function PinPad({ onDigitPress, onClear }: PinPadProps) {
  return (
    <View style={styles.container}>
      {digits.map((digit) => (
        <Pressable key={digit} style={styles.key} onPress={() => onDigitPress?.(digit)}>
          <Text style={styles.keyText}>{digit}</Text>
        </Pressable>
      ))}
      <Pressable style={[styles.key, styles.clear]} onPress={onClear}>
        <Text style={styles.keyText}>Clear</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  key: {
    width: '30%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)'
  },
  clear: {
    width: '100%'
  },
  keyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text
  }
});
