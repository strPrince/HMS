import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ArrowLeft, Plus, Minus, ChefHat } from 'lucide-react-native';
import { useRestaurantStore } from '../../store/useRestaurantStore';
import { formatCurrency } from '../../utils/helpers';
import { useAuth } from '../../providers/AuthProvider';
import { ConfirmDialog } from '../../src/components/common/ConfirmDialog';
import { showToast } from '../../src/hooks/useToast';

export default function OrderSummary() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const params = useLocalSearchParams();
  const {
    cart,
    menuItems,
    updateCartItem,
    removeFromCart,
    submitOrderToKitchen,
    getCartTotal,
    tables
  } = useRestaurantStore();
  const orderType = useRestaurantStore((state) => state.orderType);
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');

  // Get table ID from URL params (for new orders)
  const tableId = params.tableId as string;
  const table = tables.find((t) => t.id === tableId);

  const displayItems = cart.map(cartItem => {
    const menuItem = menuItems.find(mi => mi.id === cartItem.itemId);
    return {
      ...cartItem,
      item: menuItem || { id: cartItem.itemId, name: 'Unknown', price: 0 },
    };
  });

  const totalItems = displayItems.reduce((sum, { quantity }) => sum + quantity, 0);
  const totalAmount = getCartTotal();

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    const cartItem = cart.find((item) => item.itemId === itemId);
    if (!cartItem) return;

    const newQuantity = cartItem.quantity + delta;
    if (newQuantity <= 0) {
      removeFromCart(itemId);
    } else {
      updateCartItem(itemId, newQuantity);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    removeFromCart(itemId);
  };

  const handleAddMore = () => {
    router.back();
  };

  const handleSendToKitchen = () => {
    setShowConfirm(true);
  };

  const confirmSendToKitchen = async () => {
    if (submitting) return;

    if (!tableId) {
      showToast.error('Table not selected');
      return;
    }

    if (cart.length === 0) {
      showToast.error('Cart is empty');
      return;
    }

    setSubmitting(true);
    const newOrder = await submitOrderToKitchen(tableId, user?.name, customerPhone);

    if (newOrder) {
      setShowConfirm(false);
      showToast.success('Order sent to kitchen successfully!');
      router.push('/(tabs)/tables');
    } else {
      setShowConfirm(false);
      showToast.error('Failed to submit order. Please try again.');
    }
    setSubmitting(false);
  };

  if (!tableId || !table) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Table not found</Text>
      </View>
    );
  }

  if (cart.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#000" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.tableTitle}>Table {table.label}</Text>
          </View>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.emptyCart}>
          <Text style={styles.emptyText}>Cart is empty</Text>
          <Pressable style={styles.addItemsButton} onPress={() => router.back()}>
            <Text style={styles.addItemsText}>Add Items</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#000" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.tableTitle}>Table {table.label}</Text>
            <Text style={styles.dineIn}>{orderType === 'parcel' ? 'Parcel' : 'Dine In'}</Text>
          </View>
          <Pressable style={styles.addButton} onPress={handleAddMore}>
            <Plus size={20} color="#FF6B35" />
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        </View>

        {/* Current Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Items</Text>
          <Text style={styles.sectionSubtitle}>
            Review your order before sending to kitchen
          </Text>

          <View style={styles.itemsList}>
            {displayItems.map(({ itemId, item, quantity, specialInstructions }) => (
              <View key={itemId} style={styles.itemCard}>
                <View style={styles.itemImage} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {specialInstructions && (
                    <View style={styles.itemMeta}>
                      <Text style={styles.itemLabel}>{specialInstructions}</Text>
                    </View>
                  )}
                  <View style={styles.itemFooter}>
                    <View style={styles.quantityControl}>
                      <Pressable
                        style={[styles.quantityBtn, styles.quantityBtnMinus]}
                        onPress={() => handleUpdateQuantity(itemId, -1)}
                      >
                        <Minus size={16} color="#64748B" />
                      </Pressable>
                      <Text style={styles.quantityNumber}>{quantity}</Text>
                      <Pressable
                        style={[styles.quantityBtn, styles.quantityBtnPlus]}
                        onPress={() => handleUpdateQuantity(itemId, 1)}
                      >
                        <Plus size={16} color="#FFF" />
                      </Pressable>
                    </View>
                    <Text style={styles.itemPrice}>{formatCurrency(item.price * quantity)}</Text>
                  </View>
                </View>
                <Pressable
                  style={styles.removeButton}
                  onPress={() => handleRemoveItem(itemId)}
                >
                  <Minus size={16} color="#9CA3AF" />
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* Total */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total items</Text>
            <Text style={styles.totalValue}>{totalItems}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabelBold}>Total Amount</Text>
            <Text style={styles.totalAmount}>{formatCurrency(totalAmount)}</Text>
          </View>
        </View>

        <View style={styles.customerSection}>
          <Text style={styles.sectionTitle}>Customer WhatsApp</Text>
          <Text style={styles.sectionSubtitle}>Optional — used to send bill link</Text>
          <TextInput
            value={customerPhone}
            onChangeText={setCustomerPhone}
            placeholder="Enter WhatsApp number"
            keyboardType="phone-pad"
            style={styles.customerInput}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </ScrollView>

      {/* Footer Button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
        <Pressable style={styles.sendButton} onPress={handleSendToKitchen}>
          <ChefHat size={20} color="#FFF" />
          <Text style={styles.sendButtonText}>Send to Kitchen</Text>
        </Pressable>
      </View>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        visible={showConfirm}
        title={submitting ? 'Submitting Order...' : 'Send to Kitchen?'}
        message={`Are you sure you want to send ${totalItems} items to the kitchen for Table ${table.label}?`}
        confirmText={submitting ? 'Please wait...' : 'Send Order'}
        cancelText="Cancel"
        onConfirm={confirmSendToKitchen}
        onCancel={() => !submitting && setShowConfirm(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f7f5'
  },
  content: {
    paddingBottom: 120
  },
  notFound: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 40
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16
  },
  addItemsButton: {
    backgroundColor: '#ff6a00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  addItemsText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 16,
    backgroundColor: '#FFF'
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center'
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 22
  },
  dineIn: {
    fontSize: 12,
    color: '#ff6a00',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ff6a00',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999
  },
  addText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF'
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.5
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16
  },
  itemsList: {
    gap: 0
  },
  itemCard: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    flexDirection: 'row',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    position: 'relative',
    alignItems: 'flex-start'
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    flexShrink: 0
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 80
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20
  },
  itemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 4
  },
  itemLabel: {
    fontSize: 12,
    color: '#475569',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '500'
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 4
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 4
  },
  quantityBtn: {
    width: 28,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center'
  },
  quantityBtnMinus: {
    backgroundColor: '#F1F5F9'
  },
  quantityBtnPlus: {
    backgroundColor: '#ff6a00',
    shadowColor: '#ff6a00',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2
  },
  quantityNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 16,
    textAlign: 'center'
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A'
  },
  removeButton: {
    position: 'absolute',
    top: 16,
    right: -4,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkBadge: {
    position: 'absolute',
    top: 16,
    right: 40,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkIcon: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700'
  },
  noteSection: {
    paddingHorizontal: 16,
    paddingVertical: 24
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 8
  },
  customerSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  customerInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827'
  },
  noteText: {
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  totalSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  totalLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500'
  },
  totalValue: {
    fontSize: 24,
    color: '#0F172A',
    fontWeight: '700'
  },
  totalLabelBold: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B'
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ff6a00'
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8
  },
  sendButton: {
    backgroundColor: '#ff6a00',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#ff6a00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF'
  }
});
