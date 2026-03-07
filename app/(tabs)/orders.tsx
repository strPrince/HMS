import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/colors';
import { useRestaurantStore } from '../../store/useRestaurantStore';
import { formatCurrency, formatTimeAgo } from '../../utils/helpers';
import { useAuth } from '../../providers/AuthProvider';
import { Clock } from 'lucide-react-native';

type TabKey = 'active' | 'closed';

export default function Orders() {
  const { orders, tables, menuItems, getOrderTotal } = useRestaurantStore();
  const refreshOrdersFromApi = useRestaurantStore((state) => state.refreshOrdersFromApi);
  const refreshTablesFromApi = useRestaurantStore((state) => state.refreshTablesFromApi);
  const refreshMenuFromApi = useRestaurantStore((state) => state.refreshMenuFromApi);
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>('active');
  const [refreshing, setRefreshing] = useState(false);

  const activeCount = useMemo(
    () => orders.filter((order) => order.status !== 'completed').length,
    [orders]
  );
  const closedCount = useMemo(
    () => orders.filter((order) => order.status === 'completed').length,
    [orders]
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((order) =>
      tab === 'active' ? order.status !== 'completed' : order.status === 'completed'
    );
  }, [orders, tab]);

  const getTableLabel = (tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    return table?.label || tableId.replace('t', '');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshOrdersFromApi(),
        refreshTablesFromApi(),
        refreshMenuFromApi(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={styles.title}>Orders</Text>

        <View style={styles.tabs}>
          {(['active', 'closed'] as const).map((key) => (
            <Pressable
              key={key}
              style={[styles.tabButton, tab === key && styles.tabButtonActive]}
              onPress={() => setTab(key)}
            >
              {key === 'active' ? (
                <View style={styles.tabRow}>
                  <View style={[styles.tabDot, tab === key && styles.tabDotActive]} />
                  <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
                    Active ({activeCount})
                  </Text>
                </View>
              ) : (
                <View style={styles.tabRow}>
                  <Clock size={12} color={tab === key ? colors.surface : colors.mutedDark} />
                  <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
                    Closed ({closedCount})
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {filteredOrders.map((order) => {
          const items = order.items.map((line) => {
            const item = menuItems.find((mi) => mi.id === line.itemId);
            return {
              name: item?.name || 'Unknown Item',
              quantity: line.quantity,
              status: line.status || 'new'
            };
          });
          const total = getOrderTotal(order.id);
          const tableLabel = getTableLabel(order.tableId);
          const newCount = order.items.reduce((sum, item) => sum + (item.status === 'new' ? item.quantity : 0), 0);
          const readyCount = order.items.reduce((sum, item) => sum + (item.status === 'ready' ? item.quantity : 0), 0);
          const summaryLines = items.slice(0, 2);
          const extraCount = Math.max(0, items.length - 2);

          return (
            <Pressable key={order.id} style={styles.card} onPress={() => router.push(`/order/${order.id}`)}>
              <View style={styles.cardHeader}>
                <View style={styles.tableBadge}>
                  <Text style={styles.tableBadgeText}>T{tableLabel}</Text>
                </View>
                <View style={styles.headerInfo}>
                  <Text style={styles.waiterName}>{user?.name || 'Waiter'}</Text>
                  <Text style={styles.timeText}>{formatTimeAgo(order.createdAt)}</Text>
                </View>
                <Text style={styles.totalText}>{formatCurrency(total)}</Text>
              </View>

              {order.status === 'completed' && order.paymentMethod && (
                <View style={styles.paymentBadge}>
                  <Text style={styles.paymentBadgeText}>
                    {order.paymentMethod === 'cash' ? '💵 Cash' : order.paymentMethod === 'card' ? '💳 Card' : '📱 UPI'}
                  </Text>
                </View>
              )}

              <View style={styles.itemsList}>
                {summaryLines.map((line, index) => (
                  <View key={`${order.id}-${index}`} style={styles.itemRow}>
                    <View style={[styles.itemDot, line.status === 'ready' ? styles.itemDotReady : styles.itemDotNew]} />
                    <Text style={styles.itemText}>{line.quantity}x {line.name}</Text>
                  </View>
                ))}
                {extraCount > 0 ? (
                  <Text style={styles.moreText}>+{extraCount} more items</Text>
                ) : null}
                {order.notes ? <Text style={styles.noteText}>{order.notes}</Text> : null}
              </View>

              {
                (newCount > 0 || readyCount > 0) && tab === 'active' ? (
                  <View style={styles.statusRow}>
                    {newCount > 0 && (
                      <View style={[styles.statusPill, styles.statusNew]}>
                        <Text style={styles.statusText}>{newCount} new</Text>
                      </View>
                    )}
                    {readyCount > 0 && (
                      <View style={[styles.statusPill, styles.statusReady]}>
                        <Text style={styles.statusText}>{readyCount} ready</Text>
                      </View>
                    )}
                  </View>
                ) : null
              }
            </Pressable>
          );
        })}

        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No orders in this view.</Text>
          </View>
        ) : null}
      </ScrollView>
    </View >
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textStrong,
    marginBottom: 12
  },
  tabs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.mutedDark
  },
  tabDotActive: {
    backgroundColor: colors.surface
  },
  tabText: {
    fontSize: 12,
    color: colors.mutedDark,
    fontWeight: '600'
  },
  tabTextActive: {
    color: colors.surface
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  tableBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tableBadgeText: {
    fontWeight: '700',
    color: colors.primary
  },
  headerInfo: {
    flex: 1
  },
  waiterName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textStrong
  },
  timeText: {
    fontSize: 12,
    color: colors.mutedDark,
    marginTop: 2
  },
  totalText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textStrong
  },
  itemsList: {
    marginTop: 12,
    gap: 6
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  itemDotNew: {
    backgroundColor: '#3B82F6'
  },
  itemDotReady: {
    backgroundColor: colors.success
  },
  itemText: {
    fontSize: 13,
    color: colors.text
  },
  moreText: {
    fontSize: 12,
    color: colors.mutedDark,
    marginLeft: 14
  },
  noteText: {
    fontSize: 12,
    color: colors.mutedDark,
    fontStyle: 'italic',
    marginLeft: 14,
    alignSelf: 'flex-end'
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999
  },
  statusNew: {
    backgroundColor: '#EEF4FF'
  },
  statusReady: {
    backgroundColor: '#E8F9EE'
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textStrong
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32
  },
  emptyText: {
    fontSize: 13,
    color: colors.mutedDark
  },
  paymentBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E8FAE3',
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
});
