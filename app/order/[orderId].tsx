import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Minus, Trash2, ChefHat, X, Save, Edit, Send } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useRestaurantStore } from '../../store/useRestaurantStore';
import { formatCurrency, formatTimeAgo } from '../../utils/helpers';
import { useAuth } from '../../providers/AuthProvider';
import TableService from '../../src/services/table.service';
import OrderService from '../../src/services/order.service';

export default function OrderDetails() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { orders, tables, menuItems, getOrderItems, getOrderTotal, selectTable, updateOrder, markOrderAsDelivered, refreshOrdersFromApi, refreshTablesFromApi, getTableAllActiveOrders, getTableCombinedItems } = useRestaurantStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Refresh data from API on mount to ensure we have latest orders
  useEffect(() => {
    refreshOrdersFromApi();
    refreshTablesFromApi();
  }, []);

  const order = orders.find((o) => o.id === orderId);
  const [isEditing, setIsEditing] = useState(false);
  const [localItems, setLocalItems] = useState(order?.items || []);
  const [notes, setNotes] = useState(order?.notes || '');
  const [orderStatus, setOrderStatus] = useState(order?.status || 'pending');
  const [processingBilling, setProcessingBilling] = useState(false);
  const [markingDelivered, setMarkingDelivered] = useState(false);
  const [showBillSummary, setShowBillSummary] = useState(false);
  const [sendingToManager, setSendingToManager] = useState(false);

  if (!order) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Order not found</Text>
      </View>
    );
  }

  const table = tables.find((t) => t.id === order.tableId);
  const tableLabel = table?.label || order.tableId;
  const items = getOrderItems(order.id);

  // Get ALL active orders for this table and their combined items
  const allTableOrders = table ? getTableAllActiveOrders(table.id) : [order];
  const combinedItems = table ? getTableCombinedItems(table.id) : items;
  const orderCount = allTableOrders.length;

  // Calculate totals from local items when editing, otherwise from combined items
  const displayItems = isEditing ? localItems.map(li => {
    const menuItem = menuItems.find(mi => mi.id === li.itemId);
    return { item: menuItem || { id: li.itemId, name: 'Unknown', price: 0 }, quantity: li.quantity };
  }) : combinedItems;

  const subtotal = displayItems.reduce((sum, { item, quantity }) => sum + (item.price * quantity), 0);
  const gst = Math.round(subtotal * 0.05 * 100) / 100;
  const grandTotal = subtotal + gst;
  const guests = table?.guests || 0;

  const timeIn = new Date(order.createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000));
  const elapsedText = `${Math.floor(elapsedMinutes / 60)}:${String(elapsedMinutes % 60).padStart(2, '0')}`;
  const startedText = `Started ${elapsedMinutes} mins ago`;

  const handleAddMore = () => {
    selectTable(table || null);
    router.push(`/create-order?tableId=${table?.id || order.tableId}`);
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setLocalItems(prev => {
      return prev.map(item => {
        if (item.itemId === itemId) {
          const newQuantity = item.quantity + delta;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const handleRemoveItem = (itemId: string) => {
    Alert.alert(
      'Remove Item',
      'Remove this item from the order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => setLocalItems(prev => prev.filter(item => item.itemId !== itemId))
        }
      ]
    );
  };

  const handleSaveChanges = async () => {
    if (localItems.length === 0) {
      Alert.alert('Error', 'Order must have at least one item');
      return;
    }

    try {
      // Persist notes to backend
      const numId = orderId.replace(/^o/, '');
      await OrderService.updateOrder(numId, { specialNotes: notes } as any);
    } catch (e) {
      console.warn('[OrderDetails] Failed to save notes to backend:', e);
      // Continue to update local state even if API fails
    }

    updateOrder(orderId, {
      items: localItems,
      notes: notes,
      status: orderStatus
    });

    setIsEditing(false);
    Alert.alert('Success', 'Order updated successfully');
  };

  const handleCancelEdit = () => {
    setLocalItems(order?.items || []);
    setNotes(order?.notes || '');
    setOrderStatus(order?.status || 'in-kitchen');
    setIsEditing(false);
  };

  const handleCompleteOrder = () => {
    Alert.alert(
      'Send to Billing',
      `Move ${orderCount > 1 ? `all ${orderCount} orders` : 'this order'} to billing?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            if (processingBilling) return;
            setProcessingBilling(true);

            try {
              if (table?.id) {
                await TableService.updateTableStatus(table.id.replace(/^t/, ''), 'billing');
              }

              // Move ALL orders for this table to billing
              for (const o of allTableOrders) {
                const numId = o.id.replace(/^o/, '');
                try {
                  await OrderService.updateOrder(numId, { status: 'billing' });
                  updateOrder(o.id, { status: 'billing' });
                } catch (e) {
                  console.warn(`Failed to move order ${numId} to billing:`, e);
                }
              }

              await refreshOrdersFromApi();
              await refreshTablesFromApi();

              // Show read-only bill summary for waiter
              setShowBillSummary(true);
            } catch (error) {
              Alert.alert('Error', 'Failed to move order to billing. Please try again.');
            } finally {
              setProcessingBilling(false);
            }
          },
        }
      ]
    );
  };

  const handleSendToManager = async () => {
    if (sendingToManager) return;
    setSendingToManager(true);
    try {
      // Send billing request notification to manager via API
      const tableNumId = table?.id?.replace(/^t/, '') || '';
      const orderNumId = order.id.replace(/^o/, '');
      await OrderService.sendBillingRequest({
        tableId: Number(tableNumId),
        orderId: Number(orderNumId),
        tableLabel: tableLabel,
        waiterName: user?.name || 'Waiter',
        itemCount: displayItems.length,
        total: grandTotal,
      });

      Alert.alert('Sent!', 'Manager has been notified for billing.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/tables') }
      ]);
    } catch (error) {
      console.warn('Failed to send billing notification, navigating anyway');
      Alert.alert('Notified', 'Order moved to billing. Manager will see it on dashboard.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/tables') }
      ]);
    } finally {
      setSendingToManager(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (markingDelivered) return;
    setMarkingDelivered(true);
    try {
      await markOrderAsDelivered(order.id);
      setOrderStatus('served');
      Alert.alert('Delivered', 'Order marked as delivered successfully.');
    } catch (error) {
      console.warn('Failed to mark order as delivered:', error);
      Alert.alert('Error', 'Could not mark as delivered. Please try again.');
    } finally {
      setMarkingDelivered(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.textStrong} />
          </Pressable>
          <Text style={styles.title}>{orderCount > 1 ? `Table ${tableLabel}` : `Order #${order.id.replace('o', '')}`}</Text>
          {!isEditing && orderStatus !== 'completed' && (
            <Pressable style={styles.iconButton} onPress={() => setIsEditing(true)}>
              <Edit size={18} color={colors.textStrong} />
            </Pressable>
          )}
          {isEditing && (
            <Pressable style={styles.saveButton} onPress={handleSaveChanges}>
              <Save size={18} color={colors.surface} />
            </Pressable>
          )}
        </View>

        <Text style={styles.subTitle}>Table {tableLabel} • Dine In{orderCount > 1 ? ` • ${orderCount} orders` : ''}</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoGrid}>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>SERVER</Text>
              <Text style={styles.infoValue}>{user?.name || 'Waiter'}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>TIME IN</Text>
              <Text style={styles.infoValue}>{timeIn}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>GUESTS</Text>
              <Text style={styles.infoValue}>{guests}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>TIMER</Text>
              <Text style={[styles.infoValue, styles.timerValue]}>{elapsedText}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>STATUS LOG</Text>
          {isEditing && orderStatus !== 'completed' && (
            <View style={styles.statusButtons}>
              {['pending', 'preparing', 'ready'].map((status) => (
                <Pressable
                  key={status}
                  style={[
                    styles.statusButton,
                    orderStatus === status && styles.statusButtonActive
                  ]}
                  onPress={() => setOrderStatus(status as any)}
                >
                  <Text style={[
                    styles.statusButtonText,
                    orderStatus === status && styles.statusButtonTextActive
                  ]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, orderStatus === 'preparing' && styles.statusDotActive]} />
            <View style={styles.statusContent}>
              <Text style={orderStatus === 'preparing' ? styles.statusTextPrimary : styles.statusTextPrimaryMuted}>
                {orderStatus === 'preparing' ? 'Cooking' : orderStatus === 'ready' ? 'Ready' : 'Pending'}
              </Text>
              <Text style={styles.statusTextSecondary}>
                {startedText}
              </Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <View style={styles.statusContent}>
              <Text style={styles.statusTextPrimaryMuted}>Order Received</Text>
              <Text style={styles.statusTextSecondary}>{timeIn}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Items ({displayItems.length})</Text>
        <View style={styles.itemCard}>
          {displayItems.map(({ item, quantity }) => (
            <View key={item.id} style={styles.itemLine}>
              <View style={styles.itemAccent} />
              <View style={styles.itemContent}>
                <Text style={styles.itemLineText}>{quantity}x {item.name}</Text>
                <Text style={styles.itemPrice}>₹{item.price * quantity}</Text>
              </View>
              {isEditing && (
                <View style={styles.itemActions}>
                  <Pressable
                    style={styles.quantityBtn}
                    onPress={() => handleUpdateQuantity(item.id, -1)}
                  >
                    <Minus size={14} color={colors.surface} />
                  </Pressable>
                  <Pressable
                    style={styles.quantityBtn}
                    onPress={() => handleUpdateQuantity(item.id, 1)}
                  >
                    <Plus size={14} color={colors.surface} />
                  </Pressable>
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleRemoveItem(item.id)}
                  >
                    <Trash2 size={14} color={colors.danger} />
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </View>

        {isEditing && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Order Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add special instructions..."
              placeholderTextColor={colors.mutedDark}
              multiline
              numberOfLines={3}
            />
          </View>
        )}
        {!isEditing && notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Order Notes</Text>
            <Text style={styles.notesText}>{notes}</Text>
          </View>
        )}

        <View style={styles.totalCard}>
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>GST</Text>
            <Text style={styles.totalValue}>{formatCurrency(gst)}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text style={styles.totalLabelStrong}>Total</Text>
            <Text style={styles.totalValueStrong}>{formatCurrency(grandTotal)}</Text>
          </View>
        </View>

        {isEditing ? (
          <View style={styles.actionButtons}>
            <Pressable style={styles.cancelBtn} onPress={handleCancelEdit}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={handleSaveChanges}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </Pressable>
          </View>
        ) : showBillSummary ? (
          /* Read-only bill summary for waiter after completing order */
          <View style={styles.billSummarySection}>
            <View style={styles.billSummaryCard}>
              <Text style={styles.billSummaryTitle}>📋 Bill Summary</Text>
              <Text style={styles.billSummarySubtext}>Review and send to manager for payment</Text>

              <View style={styles.billDivider} />

              {displayItems.map(({ item, quantity }) => (
                <View key={item.id} style={styles.billItemRow}>
                  <Text style={styles.billItemName}>{quantity}x {item.name}</Text>
                  <Text style={styles.billItemPrice}>{formatCurrency(item.price * quantity)}</Text>
                </View>
              ))}

              <View style={styles.billDivider} />

              <View style={styles.billTotalRow}>
                <Text style={styles.billTotalLabel}>Subtotal</Text>
                <Text style={styles.billTotalValue}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={styles.billTotalRow}>
                <Text style={styles.billTotalLabel}>GST (5%)</Text>
                <Text style={styles.billTotalValue}>{formatCurrency(gst)}</Text>
              </View>
              <View style={[styles.billTotalRow, { marginTop: 4 }]}>
                <Text style={styles.billGrandLabel}>Grand Total</Text>
                <Text style={styles.billGrandValue}>{formatCurrency(grandTotal)}</Text>
              </View>
            </View>

            <Pressable
              style={[styles.sendToManagerBtn, sendingToManager && { opacity: 0.6 }]}
              onPress={handleSendToManager}
              disabled={sendingToManager}
            >
              <Send size={18} color="#FFF" />
              <Text style={styles.sendToManagerBtnText}>
                {sendingToManager ? 'Sending...' : 'Send to Manager'}
              </Text>
            </Pressable>

            <Pressable style={styles.backToTablesBtn} onPress={() => router.replace('/(tabs)/tables')}>
              <Text style={styles.backToTablesBtnText}>Back to Tables</Text>
            </Pressable>
          </View>
        ) : orderStatus !== 'completed' && (
          <View>
            {order.status === 'ready' && (
              <Pressable
                style={[styles.deliveredBtn, markingDelivered && { opacity: 0.6 }]}
                onPress={handleMarkDelivered}
                disabled={markingDelivered}
              >
                <Text style={styles.deliveredBtnText}>{markingDelivered ? 'Marking...' : '✓ Mark Delivered'}</Text>
              </Pressable>
            )}
            <View style={styles.actionButtons}>
              <Pressable style={styles.addButton} onPress={handleAddMore}>
                <Text style={styles.addButtonText}>＋ Add More Items</Text>
              </Pressable>
              <Pressable style={styles.completeBtn} onPress={handleCompleteOrder}>
                <Text style={styles.completeBtnText}>Complete Order</Text>
              </Pressable>
            </View>
          </View>
        )}
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
    gap: 10,
    marginBottom: 6
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
  iconButton: {
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
  subTitle: {
    fontSize: 13,
    color: colors.mutedDark,
    marginBottom: 14
  },
  notFound: {
    fontSize: 16,
    color: colors.mutedDark,
    padding: 16
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  infoCell: {
    width: '50%',
    paddingVertical: 10
  },
  infoLabel: {
    fontSize: 10,
    color: colors.mutedDark,
    letterSpacing: 0.6
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textStrong,
    marginTop: 4
  },
  timerValue: {
    color: colors.danger
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16
  },
  statusTitle: {
    fontSize: 11,
    color: colors.mutedDark,
    letterSpacing: 0.6,
    marginBottom: 10
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
    marginTop: 6
  },
  statusDotActive: {
    backgroundColor: colors.success
  },
  statusContent: {
    flex: 1
  },
  statusTextPrimary: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success
  },
  statusTextPrimaryMuted: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textStrong
  },
  statusTextSecondary: {
    fontSize: 11,
    color: colors.mutedDark,
    marginTop: 2
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textStrong,
    marginBottom: 10
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16
  },
  itemLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6
  },
  itemAccent: {
    width: 4,
    height: 22,
    borderRadius: 999,
    backgroundColor: colors.success
  },
  itemLineText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textStrong
  },
  totalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6
  },
  totalLabel: {
    fontSize: 13,
    color: colors.mutedDark
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textStrong
  },
  totalLabelStrong: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textStrong
  },
  totalValueStrong: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary
  },
  addButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
    flex: 1
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary
  },
  saveButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  statusButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center'
  },
  statusButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedDark
  },
  statusButtonTextActive: {
    color: colors.surface
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedDark
  },
  itemActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8
  },
  quantityBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center'
  },
  notesSection: {
    marginBottom: 16
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 14,
    color: colors.textStrong,
    minHeight: 80,
    textAlignVertical: 'top'
  },
  notesText: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 14,
    color: colors.textStrong
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.danger,
    paddingVertical: 14,
    alignItems: 'center'
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.danger
  },
  saveBtn: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center'
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.surface
  },
  completeBtn: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.success,
    paddingVertical: 14,
    alignItems: 'center'
  },
  completeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.surface
  },
  deliveredBtn: {
    borderRadius: 14,
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  deliveredBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  billSummarySection: {
    marginTop: 8,
  },
  billSummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  billSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textStrong,
    textAlign: 'center',
  },
  billSummarySubtext: {
    fontSize: 12,
    color: colors.mutedDark,
    textAlign: 'center',
    marginTop: 4,
  },
  billDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  billItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  billItemName: {
    fontSize: 14,
    color: colors.textStrong,
    flex: 1,
  },
  billItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textStrong,
  },
  billTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  billTotalLabel: {
    fontSize: 13,
    color: colors.mutedDark,
  },
  billTotalValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textStrong,
  },
  billGrandLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textStrong,
  },
  billGrandValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  sendToManagerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 10,
  },
  sendToManagerBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  backToTablesBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  backToTablesBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedDark,
  },
});
