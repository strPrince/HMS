import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Plus, Minus } from 'lucide-react-native';
import { colors } from '../constants/colors';
import { formatCurrency } from '../utils/helpers';

type MenuItemCardProps = {
  name: string;
  description?: string;
  price: number;
  quantity: number;
  onAdd?: () => void;
  onRemove?: () => void;
};

export default function MenuItemCard({
  name,
  description,
  price,
  quantity,
  onAdd,
  onRemove
}: MenuItemCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.thumbnail} />
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        {description ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
        <Text style={styles.price}>{formatCurrency(price)}</Text>
      </View>
      <View style={styles.controls}>
        {quantity > 0 ? (
          <Pressable style={styles.controlButton} onPress={onRemove}>
            <Minus size={14} color={colors.primary} />
          </Pressable>
        ) : (
          <View style={styles.controlSpacer} />
        )}
        <Pressable style={styles.addButton} onPress={onAdd}>
          <Plus size={16} color={colors.surface} />
        </Pressable>
        {quantity > 0 ? <Text style={styles.quantityText}>{quantity}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    marginRight: 12
  },
  info: {
    flex: 1
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textStrong
  },
  description: {
    fontSize: 12,
    color: colors.mutedDark,
    marginTop: 4
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textStrong,
    marginTop: 6
  },
  controls: {
    alignItems: 'center',
    gap: 6,
    width: 56
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  controlButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  controlSpacer: {
    width: 28,
    height: 28
  },
  quantityText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textStrong
  }
});
