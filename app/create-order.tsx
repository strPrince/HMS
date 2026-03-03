import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search } from 'lucide-react-native';
import { colors } from '../constants/colors';
import { useRestaurantStore } from '../store/useRestaurantStore';
import MenuItemCard from '../components/MenuItemCard';
import { formatCurrency } from '../utils/helpers';

export default function CreateOrder() {
  const { menuItems, selectedTable, addOrder } = useRestaurantStore();
  const router = useRouter();

  const [orderItems, setOrderItems] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Popular');
  const [note, setNote] = useState('');

  const categories = useMemo(() => {
    const unique = Array.from(new Set(menuItems.map((item) => item.category).filter(Boolean)));
    return ['Popular', ...unique] as string[];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return menuItems.filter((item) => {
      const matchesQuery =
        !normalized ||
        item.name.toLowerCase().includes(normalized) ||
        (item.description || '').toLowerCase().includes(normalized);
      const matchesCategory =
        activeCategory === 'Popular'
          ? item.isPopular
          : item.category === activeCategory;
      return matchesQuery && matchesCategory;
    });
  }, [activeCategory, menuItems, query]);

  const handleAddItem = (itemId: string) => {
    setOrderItems((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    setOrderItems((prev) => {
      const nextCount = Math.max(0, (prev[itemId] || 0) - 1);
      if (nextCount === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: nextCount };
    });
  };

  const calculateTotal = () => {
    return Object.entries(orderItems).reduce((total, [itemId, quantity]) => {
      const item = menuItems.find((mi) => mi.id === itemId);
      return total + (item?.price || 0) * quantity;
    }, 0);
  };

  const handleCreateOrder = () => {
    if (!selectedTable) return;

    const order = {
      id: `o${Date.now()}`,
      tableId: selectedTable.id,
      items: Object.entries(orderItems).map(([itemId, quantity]) => ({
        itemId,
        quantity,
        status: 'new' as const
      })),
      status: 'open' as const,
      createdAt: new Date().toISOString(),
      notes: note.trim() || undefined
    };

    addOrder(order);
    setOrderItems({});
    setNote('');
    router.replace('/(tabs)/orders');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.textStrong} />
          </Pressable>
          <Text style={styles.title}>Menu</Text>
          <View style={styles.tableChip}>
            <Text style={styles.tableChipText}>Table {selectedTable?.label || '--'}</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <Search size={16} color={colors.mutedDark} />
          <TextInput
            placeholder="Search dishes..."
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {categories.map((category) => (
            <Pressable
              key={category}
              style={[
                styles.categoryChip,
                activeCategory === category && styles.categoryChipActive
              ]}
              onPress={() => setActiveCategory(category)}
            >
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === category && styles.categoryTextActive
                ]}
              >
                {category}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {activeCategory === 'Popular' ? 'Popular Items' : activeCategory}
          </Text>
          <Text style={styles.seeAll}>See all</Text>
        </View>

        <View style={styles.menuList}>
          {filteredItems.map((item) => (
            <MenuItemCard
              key={item.id}
              name={item.name}
              description={item.description}
              price={item.price}
              quantity={orderItems[item.id] || 0}
              onAdd={() => handleAddItem(item.id)}
              onRemove={() => handleRemoveItem(item.id)}
            />
          ))}
        </View>

        {Object.keys(orderItems).length > 0 ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <View style={styles.summaryItems}>
              {Object.entries(orderItems).map(([itemId, quantity]) => {
                const item = menuItems.find((mi) => mi.id === itemId);
                return (
                  <View key={itemId} style={styles.summaryRow}>
                    <Text style={styles.summaryText}>
                      {quantity}x {item?.name}
                    </Text>
                    <Text style={styles.summaryPrice}>
                      {formatCurrency((item?.price || 0) * quantity)}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.noteRow}>
              <TextInput
                placeholder="Add note for order..."
                placeholderTextColor={colors.muted}
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
              />
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(calculateTotal())}</Text>
            </View>
            <Pressable style={styles.submitButton} onPress={handleCreateOrder}>
              <Text style={styles.submitButtonText}>Place Order</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: 16,
    paddingBottom: 32
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textStrong,
    flex: 1
  },
  tableChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  tableChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedDark
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    gap: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textStrong
  },
  categoryRow: {
    gap: 8,
    paddingBottom: 8
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  categoryText: {
    fontSize: 12,
    color: colors.mutedDark,
    fontWeight: '600'
  },
  categoryTextActive: {
    color: colors.surface
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textStrong
  },
  seeAll: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600'
  },
  menuList: {
    gap: 12
  },
  summaryCard: {
    marginTop: 20,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textStrong,
    marginBottom: 12
  },
  summaryItems: {
    gap: 8
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  summaryText: {
    fontSize: 13,
    color: colors.text
  },
  summaryPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textStrong
  },
  noteRow: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  noteInput: {
    fontSize: 12,
    color: colors.textStrong
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textStrong
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textStrong
  },
  submitButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center'
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.surface
  }
});
