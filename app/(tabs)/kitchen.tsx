import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bell, ChefHat, Wifi } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useRestaurantStore } from '../../store/useRestaurantStore';
import { formatTimeAgo } from '../../utils/helpers';

type FilterKey = 'all' | 'dinein';

export default function Kitchen() {
  const { orders, tables, getOrderItems, updateOrder } = useRestaurantStore();
  const [filter, setFilter] = useState<FilterKey>('all');

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status === 'open' || order.status === 'preparing'),
    [orders]
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return activeOrders;
    return activeOrders;
  }, [activeOrders, filter]);

  const handleMarkReady = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    updateOrder(orderId, {
      status: 'ready',
      items: order.items.map((item) => ({ ...item, status: 'ready' }))
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <ChefHat size={18} color={colors.success} />
            </View>
            <View>
              <Text style={styles.title}>Kitchen Display</Text>
              <Text style={styles.subtitle}>Shift: Lunch · {activeOrders.length} Active Orders</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable style={styles.iconButton}>
              <Bell size={16} color={colors.textStrong} />
            </Pressable>
            <Wifi size={18} color={colors.success} />
          </View>
        </View>

        <View style={styles.filters}>
          <Pressable
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All Orders ({activeOrders.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, filter === 'dinein' && styles.filterChipActiveOutline]}
            onPress={() => setFilter('dinein')}
          >
            <Text style={[styles.filterText, filter === 'dinein' && styles.filterTextAccent]}>
              Dine-in ({activeOrders.length})
            </Text>
          </Pressable>
        </View>

        {filtered.map((order) => {
          const tableLabel = tables.find((t) => t.id === order.tableId)?.label || order.tableId.replace('t', '');
          const items = getOrderItems(order.id);
          const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000));
          const elapsedText = `${Math.floor(elapsedMinutes / 60)}:${String(elapsedMinutes % 60).padStart(2, '0')}`;
          const orderNumber = order.id.replace('o', '');

          return (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderStripe} />
              <View style={styles.orderMeta}>
                <View style={styles.orderBadge}>
                  <View style={styles.badgeDot} />
                  <Text style={styles.orderBadgeText}>NEW ORDER</Text>
                </View>
                <Text style={styles.orderNumber}>#{orderNumber}</Text>
              </View>
              <View style={styles.orderHeader}>
                <Text style={styles.tableTitle}>T-{tableLabel}</Text>
                <View style={styles.elapsedBlock}>
                  <Text style={styles.elapsedValue}>{elapsedText}</Text>
                  <Text style={styles.elapsedLabel}>elapsed</Text>
                </View>
              </View>
              <Text style={styles.orderSub}>Dine-in · Server: Amit</Text>
              <View style={styles.itemPill}>
                <View style={styles.qtyBox}>
                  <Text style={styles.qtyText}>{items[0]?.quantity || 1}</Text>
                </View>
                <Text style={styles.itemName}>{items[0]?.item.name || 'Paneer Tikka'}</Text>
                <View style={styles.bellButton}>
                  <Bell size={14} color={colors.mutedDark} />
                </View>
              </View>
              <Pressable style={styles.readyButton} onPress={() => handleMarkReady(order.id)}>
                <Text style={styles.readyButtonText}>Mark Order Ready</Text>
              </Pressable>
            </View>
          );
        })}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#E8F9EE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textStrong
  },
  subtitle: {
    fontSize: 12,
    color: colors.mutedDark,
    marginTop: 2
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  filters: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  filterChipActive: {
    backgroundColor: colors.success,
    borderColor: colors.success
  },
  filterChipActiveOutline: {
    backgroundColor: colors.surface,
    borderColor: colors.border
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedDark
  },
  filterTextActive: {
    color: colors.surface
  },
  filterTextAccent: {
    color: colors.textStrong
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3
  },
  orderStripe: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 4,
    borderRadius: 999,
    backgroundColor: '#FF4D4F'
  },
  qtyBox: {
    minWidth: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textStrong
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textStrong
  },
  readyButton: {
    marginTop: 14,
    backgroundColor: colors.success,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center'
  },
  readyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.surface
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E8F9EE'
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success
  },
  orderBadgeText: {
    fontSize: 10,
    color: colors.success,
    fontWeight: '700'
  },
  orderNumber: {
    fontSize: 12,
    color: colors.mutedDark
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10
  },
  tableTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textStrong
  },
  elapsedBlock: {
    alignItems: 'flex-end'
  },
  elapsedValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF4D4F'
  },
  elapsedLabel: {
    fontSize: 10,
    color: colors.mutedDark,
    marginTop: 2
  },
  orderSub: {
    fontSize: 12,
    color: colors.mutedDark,
    marginTop: 4
  },
  itemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    marginTop: 12
  },
  bellButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface
  }
});
