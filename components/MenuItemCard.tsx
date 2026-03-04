import React, { memo } from 'react';
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

const MenuItemCard = memo(function MenuItemCard({
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
      <Pressable style={styles.addButton} onPress={onAdd}>
        <Plus size={20} color="#FFF" />
      </Pressable>
      {quantity > 0 && (
        <View style={styles.quantityBadge}>
          <Text style={styles.quantityText}>{quantity}</Text>
        </View>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.name === nextProps.name &&
    prevProps.price === nextProps.price &&
    prevProps.quantity === nextProps.quantity
  );
});

export default MenuItemCard;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'transparent'
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 16,
    flexShrink: 0
  },
  info: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1d130c',
    marginBottom: 4,
    lineHeight: 20
  },
  description: {
    fontSize: 12,
    color: '#a16b45',
    marginTop: 4,
    lineHeight: 16
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1d130c',
    marginTop: 8
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ff6a00',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    bottom: 12,
    shadowColor: '#ff6a00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4
  },
  quantityBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: '#ff6a00',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    shadowColor: '#ff6a00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3
  },
  quantityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF'
  }
});
