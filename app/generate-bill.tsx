import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, Alert, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Printer, Share2 } from 'lucide-react-native';
import { colors } from '../constants/colors';
import { RESTAURANT } from '../constants/restaurant';
import { useRestaurantStore } from '../store/useRestaurantStore';
import { formatCurrency, formatDate } from '../utils/helpers';
import type { PaymentMethod } from '../types/restaurant';
import OrderService from '../src/services/order.service';
import TableService from '../src/services/table.service';

type Params = {
  tableId?: string;
  orderId?: string;
};

type BillItem = {
  item: {
    id: string;
    name: string;
    price: number;
  };
  quantity: number;
};

const BillItemRow = React.memo(
  function BillItemRow({ item, quantity }: BillItem) {
    return (
      <View style={styles.itemRow}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemQuantity}>{quantity}</Text>
        <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
        <Text style={styles.itemTotal}>{formatCurrency(item.price * quantity)}</Text>
      </View>
    );
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.price === next.item.price &&
    prev.quantity === next.quantity
);

export default function GenerateBill() {
  const { tableId, orderId: orderIdParam } = useLocalSearchParams<Params>();
  const orders = useRestaurantStore((state) => state.orders);
  const getOrderItems = useRestaurantStore((state) => state.getOrderItems);
  const getOrderTotal = useRestaurantStore((state) => state.getOrderTotal);
  const completeOrder = useRestaurantStore((state) => state.completeOrder);
  const updateTable = useRestaurantStore((state) => state.updateTable);
  const refreshOrdersFromApi = useRestaurantStore((state) => state.refreshOrdersFromApi);

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [discountInput, setDiscountInput] = useState('0');
  const [markingPaid, setMarkingPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  const discountPercent = useMemo(() => {
    const parsed = Number(discountInput.replace(/[^0-9.]/g, ''));
    if (Number.isNaN(parsed)) return 0;
    return Math.min(Math.max(parsed, 0), 50); // clamp between 0–50%
  }, [discountInput]);

  const billingOrder = useMemo(() => {
    if (orderIdParam) {
      const directOrder = orders.find((o) => o.id === orderIdParam);
      if (directOrder) return directOrder;
    }

    if (tableId) {
      const billingForTable = orders
        .filter((o) => o.tableId === tableId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .find((o) => o.status === 'billing' || o.status === 'ready');

      if (billingForTable) return billingForTable;
    }

    const candidates = orders.filter(
      (o) =>
        o.status === 'billing' ||
        o.status === 'completed'
    );
    if (!candidates.length) return null;

    return [...candidates].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  }, [orders, orderIdParam, tableId]);

  const orderItems: BillItem[] = useMemo(
    () => (billingOrder ? getOrderItems(billingOrder.id) : []),
    [billingOrder, getOrderItems]
  );

  const subtotal = useMemo(
    () => (billingOrder ? getOrderTotal(billingOrder.id) : 0),
    [billingOrder, getOrderTotal]
  );

  // Apply discount first, then tax on discounted subtotal
  const discountAmount = useMemo(
    () => subtotal * (discountPercent / 100),
    [subtotal, discountPercent]
  );
  const taxableAmount = useMemo(
    () => Math.max(0, subtotal - discountAmount),
    [subtotal, discountAmount]
  );
  const tax = useMemo(() => taxableAmount * RESTAURANT.taxRate, [taxableAmount]);
  const grandTotal = useMemo(
    () => taxableAmount + tax,
    [taxableAmount, tax]
  );

  const handlePrint = useCallback(() => {
    if (!billingOrder) return;
    console.log('Printing bill for order:', billingOrder.id);
  }, [billingOrder]);

  const handleShare = useCallback(async () => {
    if (!billingOrder) return;
    const lines: string[] = [
      RESTAURANT.name,
      RESTAURANT.address,
      RESTAURANT.phone,
      '─'.repeat(30),
      `Bill #${billingOrder.id.replace(/^o/, '')}  |  ${formatDate(billingOrder.createdAt)}`,
      `Table: ${billingOrder.tableId.replace(/^t/, '')}`,

      '─'.repeat(30),
    ];
    orderItems.forEach(({ item, quantity }) => {
      lines.push(`${item.name}  x${quantity}  ${formatCurrency(item.price * quantity)}`);
    });
    lines.push('─'.repeat(30));
    lines.push(`Subtotal:  ${formatCurrency(subtotal)}`);
    if (discountPercent > 0) {
      lines.push(`Discount (${discountPercent}%):  -${formatCurrency(discountAmount)}`);
    }
    lines.push(`${RESTAURANT.taxLabel}:  ${formatCurrency(tax)}`);
    lines.push(`Grand Total:  ${formatCurrency(grandTotal)}`);
    lines.push('─'.repeat(30));
    lines.push('Thank you for dining with us!');

    try {
      await Share.share({ message: lines.join('\n') });
    } catch (error) {
      console.error('Share failed:', error);
    }
  }, [billingOrder, orderItems, subtotal, discountPercent, discountAmount, tax, grandTotal]);

  const handleMarkAsPaid = useCallback(() => {
    if (!billingOrder || markingPaid) return;

    Alert.alert(
      'Mark as Paid',
      `Confirm payment received for ${formatCurrency(grandTotal)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setMarkingPaid(true);

              await OrderService.updateOrder(billingOrder.id.replace(/^o/, ''), { status: 'completed' });

              if (billingOrder.tableId) {
                await TableService.updateTableStatus(billingOrder.tableId.replace(/^t/, ''), 'available');
                updateTable(billingOrder.tableId, { status: 'available', currentOrderId: undefined });
              }

              completeOrder(billingOrder.id, discountPercent, paymentMethod);
              await refreshOrdersFromApi();

              Alert.alert('Success', 'Payment marked as completed.', [
                { text: 'OK', onPress: () => router.replace('/(tabs)/tables') },
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to complete payment. Please try again.');
            } finally {
              setMarkingPaid(false);
            }
          },
        },
      ]
    );
  }, [billingOrder, markingPaid, grandTotal, discountPercent, paymentMethod, updateTable, completeOrder, refreshOrdersFromApi, router]);

  const renderBillItem = useCallback(
    ({ item }: { item: BillItem }) => (
      <BillItemRow item={item.item} quantity={item.quantity} />
    ),
    []
  );

  const keyExtractor = useCallback(
    (item: BillItem) => item.item.id,
    []
  );

  if (!billingOrder) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 8, paddingHorizontal: 16 },
        ]}
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.noBills}>
          No orders in billing to generate a bill.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orderItems}
        keyExtractor={keyExtractor}
        renderItem={renderBillItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + 8 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <View style={styles.headerRow}>
              <Pressable
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <ArrowLeft size={24} color={colors.text} />
              </Pressable>
              <Text style={styles.title}>Bill Preview</Text>
            </View>

            <View style={styles.billHeader}>
              <Text style={styles.restaurantName}>{RESTAURANT.name}</Text>
              <Text style={styles.restaurantAddress}>
                {RESTAURANT.address}
              </Text>
              <Text style={styles.restaurantPhone}>{RESTAURANT.phone}</Text>
              <View style={styles.billInfo}>
                <Text style={styles.billNumber}>Bill #{billingOrder.id.replace(/^o/, '')}</Text>
                <Text style={styles.billDate}>
                  {formatDate(billingOrder.createdAt)}
                </Text>
              </View>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoText}>Table: {billingOrder.tableId.replace(/^t/, '')}</Text>
              <Text style={styles.infoText}>
                Items: {orderItems.length} • Guests billed
              </Text>
            </View>

            <View style={styles.itemsHeader}>
              <Text style={styles.itemsHeaderText}>Item</Text>
              <Text style={styles.itemsHeaderText}>Qty</Text>
              <Text style={styles.itemsHeaderText}>Price</Text>
              <Text style={styles.itemsHeaderText}>Total</Text>
            </View>
          </View>
        }
        ListFooterComponent={
          <View>
            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(subtotal)}
                </Text>
              </View>

              <View style={styles.discountRow}>
                <View style={styles.discountLabelContainer}>
                  <Text style={styles.totalLabel}>Discount (%)</Text>
                  <Text style={styles.discountHint}>
                    Optional • Max 50%
                  </Text>
                </View>
                <TextInput
                  style={styles.discountInput}
                  value={discountInput}
                  onChangeText={setDiscountInput}
                  keyboardType="numeric"
                  maxLength={4}
                  placeholder="0"
                  placeholderTextColor={colors.muted}
                />
              </View>

              {discountPercent > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Discount</Text>
                  <Text style={styles.totalValue}>
                    -{formatCurrency(discountAmount)}
                  </Text>
                </View>
              )}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{RESTAURANT.taxLabel}</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(tax)}
                </Text>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabelBold}>Grand Total</Text>
                <Text style={styles.totalValueBold}>
                  {formatCurrency(grandTotal)}
                </Text>
              </View>
            </View>

            <View style={styles.paymentSection}>
              <Text style={styles.paymentTitle}>Payment Method</Text>
              <View style={styles.paymentMethodRow}>
                {(['cash', 'card', 'upi'] as PaymentMethod[]).map((method) => (
                  <Pressable
                    key={method}
                    style={[styles.paymentMethodPill, paymentMethod === method && styles.paymentMethodPillActive]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text style={[styles.paymentMethodText, paymentMethod === method && styles.paymentMethodTextActive]}>
                      {method === 'cash' ? '💵 Cash' : method === 'card' ? '💳 Card' : '📱 UPI'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.paymentSubtext}>
                Thank you for dining with us!
              </Text>
            </View>

            <View style={styles.actionsContainer}>
              <Pressable style={styles.printButton} onPress={handlePrint}>
                <Printer size={20} color={colors.surface} />
                <Text style={styles.printButtonText}>Print</Text>
              </Pressable>
              <Pressable style={styles.shareButton} onPress={handleShare}>
                <Share2 size={20} color={colors.surface} />
                <Text style={styles.shareButtonText}>Share</Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.payButton, markingPaid && styles.payButtonDisabled]}
              onPress={handleMarkAsPaid}
              disabled={markingPaid}
            >
              <Text style={styles.payButtonText}>
                {markingPaid ? 'Processing...' : 'Mark as Paid'}
              </Text>
            </Pressable>

            {/* Manager-only completion note */}
            <View style={styles.managerNote}>
              <Text style={styles.managerNoteText}>
                ℹ️ Payment completion updates order and table state in real-time.
              </Text>
            </View>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  headerSection: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  noBills: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    paddingTop: 24,
  },
  billHeader: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  restaurantName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 6,
  },
  restaurantAddress: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 2,
    textAlign: 'center',
  },
  restaurantPhone: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 12,
  },
  billInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  billNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  billDate: {
    fontSize: 13,
    color: colors.muted,
  },
  infoSection: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  itemsHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 8,
    marginBottom: 4,
  },
  itemsHeaderText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
    backgroundColor: colors.surface,
  },
  itemName: {
    flex: 1.4,
    fontSize: 13,
    color: colors.text,
  },
  itemQuantity: {
    flex: 0.7,
    fontSize: 13,
    color: colors.text,
    textAlign: 'center',
  },
  itemPrice: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    textAlign: 'center',
  },
  itemTotal: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  totalsSection: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  totalLabel: {
    fontSize: 13,
    color: colors.text,
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  totalLabelBold: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  totalValueBold: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  discountLabelContainer: {
    flex: 1,
  },
  discountHint: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  discountInput: {
    width: 72,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
    paddingHorizontal: 8,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    fontSize: 14,
    fontWeight: '600',
  },
  paymentSection: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  paymentMethodPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  paymentMethodPillActive: {
    backgroundColor: '#E8FAE3',
    borderColor: colors.success,
  },
  paymentMethodText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedDark,
  },
  paymentMethodTextActive: {
    color: '#15803D',
    fontWeight: '700',
  },
  paymentSubtext: {
    fontSize: 13,
    color: colors.muted,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  printButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  printButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.surface,
    marginLeft: 8,
  },
  shareButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.surface,
    marginLeft: 8,
  },
  payButton: {
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  managerNote: {
    backgroundColor: '#FFF4E6',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFD68F',
  },
  managerNoteText: {
    fontSize: 14,
    color: '#B45309',
    textAlign: 'center',
    lineHeight: 20,
  },
});
