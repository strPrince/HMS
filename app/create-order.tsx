import React, { useMemo, useState, useCallback } from 'react';
import { Pressable, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Search, SlidersHorizontal } from 'lucide-react-native';
import { colors } from '../constants/colors';
import { useRestaurantStore } from '../store/useRestaurantStore';
import type { OrderType } from '../types/restaurant';
import MenuItemCard from '../components/MenuItemCard';
import ItemCustomizationModal from '../components/ItemCustomizationModal';

export default function CreateOrder() {
  const menuItems = useRestaurantStore(state => state.menuItems);
  const cart = useRestaurantStore(state => state.cart);
  const addToCart = useRestaurantStore(state => state.addToCart);
  const updateCartItem = useRestaurantStore(state => state.updateCartItem);
  const removeFromCart = useRestaurantStore(state => state.removeFromCart);
  const getCartItemCount = useRestaurantStore(state => state.getCartItemCount);
  const orderType = useRestaurantStore(state => state.orderType);
  const setOrderType = useRestaurantStore(state => state.setOrderType);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Items');
  const [showCustomization, setShowCustomization] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(menuItems.map((item) => item.category).filter(Boolean)));
    return ['All Items', 'Starters', 'Main Course', ...unique.filter(c => c !== 'Starters' && c !== 'Main Course')] as string[];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return menuItems.filter((item) => {
      const matchesQuery =
        !normalized ||
        item.name.toLowerCase().includes(normalized) ||
        (item.description || '').toLowerCase().includes(normalized);
      const matchesCategory =
        activeCategory === 'All Items'
          ? true
          : item.category === activeCategory;
      return matchesQuery && matchesCategory;
    });
  }, [activeCategory, menuItems, query]);

  const handleAddItem = useCallback((item: any) => {
    setSelectedItem(item);
    setShowCustomization(true);
  }, []);

  const handleAddToCart = useCallback((quantity: number, customizations: any) => {
    if (!selectedItem) return;

    addToCart({
      itemId: selectedItem.id,
      quantity,
      specialInstructions: customizations.notes,
      spiceLevel: customizations.spiceLevel,
      dietPreference: customizations.dietPreference,
    });

    setShowCustomization(false);
    setSelectedItem(null);
  }, [selectedItem, addToCart]);

  const handleRemoveItem = useCallback((itemId: string) => {
    const cartItem = cart.find((item) => item.itemId === itemId);
    if (!cartItem) return;

    if (cartItem.quantity === 1) {
      removeFromCart(itemId);
    } else {
      updateCartItem(itemId, cartItem.quantity - 1);
    }
  }, [cart, removeFromCart, updateCartItem]);

  const getItemQuantity = useCallback((itemId: string) => {
    const cartItem = cart.find((item) => item.itemId === itemId);
    return cartItem?.quantity || 0;
  }, [cart]);

  const handleViewOrder = useCallback(() => {
    router.push(`/order-summary/new?tableId=${params.tableId}`);
  }, [params.tableId, router]);

  const handleBack = useCallback(() => router.back(), [router]);

  const renderItem = useCallback(({ item }: { item: any }) => (
    <MenuItemCard
      name={item.name}
      description={item.description}
      price={item.price}
      quantity={getItemQuantity(item.id)}
      onAdd={() => handleAddItem(item)}
      onRemove={() => handleRemoveItem(item.id)}
    />
  ), [getItemQuantity, handleAddItem, handleRemoveItem]);

  const keyExtractor = useCallback((item: any) => item.id, []);

  const renderCategoryItem = useCallback(({ item: category }: { item: string }) => (
    <Pressable
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
  ), [activeCategory]);

  const ListHeaderComponent = useCallback(() => (
    <>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color="#000" />
        </Pressable>
        <Text style={styles.title}>Menu</Text>
        <Pressable style={styles.filterButton}>
          <SlidersHorizontal size={24} color="#FF6B35" />
        </Pressable>
      </View>

      {/* Order Type Toggle */}
      <View style={styles.orderTypeRow}>
        {(['dine-in', 'parcel'] as OrderType[]).map((type) => (
          <Pressable
            key={type}
            style={[styles.orderTypePill, orderType === type && styles.orderTypePillActive]}
            onPress={() => setOrderType(type)}
          >
            <Text style={[styles.orderTypePillText, orderType === type && styles.orderTypePillTextActive]}>
              {type === 'dine-in' ? '🍽️ Dine-In' : '📦 Parcel'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.searchBar}>
        <Search size={20} color="#999" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search menu..."
          style={styles.searchInput}
          placeholderTextColor="#999"
        />
      </View>

      <FlatList
        horizontal
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      />
    </>
  ), [insets.top, handleBack, query, categories, renderCategoryItem]);

  const ListFooterComponent = useCallback(() => (
    <View style={styles.listFooter} />
  ), []);

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      />

      {cart.length > 0 && (
        <Pressable
          style={[styles.viewOrderButton, { bottom: Math.max(insets.bottom, 24) }]}
          onPress={handleViewOrder}
        >
          <Text style={styles.viewOrderText}>
            View Order ({getCartItemCount()} items)
          </Text>
        </Pressable>
      )}

      {selectedItem && (
        <ItemCustomizationModal
          visible={showCustomization}
          onClose={() => {
            setShowCustomization(false);
            setSelectedItem(null);
          }}
          onAddToOrder={handleAddToCart}
          itemName={selectedItem.name}
          itemDescription={selectedItem.description}
          itemPrice={selectedItem.price}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f7f5'
  },
  content: {
    paddingBottom: 100
  },
  listFooter: {
    height: 120
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20
  },
  filterButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1d130c',
    flex: 1,
    textAlign: 'center'
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1d130c'
  },
  categoryRow: {
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingBottom: 16
  },
  categoryChip: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 9999,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  categoryChipActive: {
    backgroundColor: '#ff6a00',
    borderColor: '#ff6a00',
    shadowColor: '#ff6a00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  categoryText: {
    fontSize: 14,
    color: '#1d130c',
    fontWeight: '500'
  },
  categoryTextActive: {
    color: '#FFF',
    fontWeight: '600'
  },
  viewOrderButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ff6a00',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#ff6a00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  viewOrderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF'
  },
  orderTypeRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  orderTypePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFF',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  orderTypePillActive: {
    backgroundColor: '#FFF1E6',
    borderColor: '#ff6a00',
  },
  orderTypePillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  orderTypePillTextActive: {
    color: '#ff6a00',
    fontWeight: '700',
  },
});
