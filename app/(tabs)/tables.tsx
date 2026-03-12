import { useMemo, useState, useCallback, memo } from 'react';
import { Alert, Pressable, FlatList, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, Users, Utensils, Receipt, CheckCircle2 } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useRestaurantStore } from '../../store/useRestaurantStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { NotificationPanel } from '../../components/NotificationPanel';
import { formatDuration } from '../../utils/helpers';
import { useAuth } from '../../providers/AuthProvider';

type FilterKey = 'all' | 'occupied' | 'ready' | 'billing';

const TableCard = memo(function TableCard({
  table,
  activeOrder,
  hasReadyOrder,
  readyOrderCount,
  totalItemCount,
  onPress
}: {
  table: any;
  activeOrder: any;
  hasReadyOrder: boolean;
  readyOrderCount: number;
  totalItemCount: number;
  onPress: () => void;
}) {
  const isAvailable = table.status === 'available';
  const isBilling = table.status === 'billing';
  const isReadyToServe = !isAvailable && !isBilling && hasReadyOrder;
  const cardStyle = isAvailable
    ? styles.cardFree
    : isReadyToServe
      ? styles.cardReady
      : isBilling
        ? styles.cardBilling
        : styles.cardOccupied;
  const textColor = isAvailable ? '#D0D0D0' : '#FFF';

  return (
    <Pressable
      style={[styles.tableCard, cardStyle]}
      onPress={onPress}
    >
      {!isAvailable && (
        <View style={styles.cardHeader}>
          <Text style={styles.statusBadge}>
            {isBilling ? 'BILLING' : isReadyToServe ? `READY (${readyOrderCount})` : 'OCCUPIED'}
          </Text>
          {isReadyToServe ? (
            <CheckCircle2 size={18} color="#FFF" />
          ) : isBilling ? (
            <Receipt size={18} color="#FFF" />
          ) : (
            <Users size={18} color="#FFF" />
          )}
        </View>
      )}
      {isAvailable && (
        <Text style={styles.freeLabel}>FREE</Text>
      )}
      <Text style={[styles.tableNumber, { color: textColor }]}>
        {table.label}
      </Text>
      {activeOrder && !isAvailable ? (
        <Text style={styles.tableMeta}>
          {totalItemCount} items
          {table.elapsedMinutes ? ` • ${formatDuration(table.elapsedMinutes)}` : ''}
        </Text>
      ) : null}
    </Pressable>
  );
}, (prev, next) => {
  return (
    prev.table.id === next.table.id &&
    prev.table.status === next.table.status &&
    prev.hasReadyOrder === next.hasReadyOrder &&
    prev.readyOrderCount === next.readyOrderCount &&
    prev.table.elapsedMinutes === next.table.elapsedMinutes &&
    prev.activeOrder?.id === next.activeOrder?.id &&
    prev.totalItemCount === next.totalItemCount
  );
});

export default function Tables() {
  const tables = useRestaurantStore(state => state.tables);
  const selectTable = useRestaurantStore(state => state.selectTable);
  const getTableActiveOrder = useRestaurantStore(state => state.getTableActiveOrder);
  const getTableAllActiveOrders = useRestaurantStore(state => state.getTableAllActiveOrders);
  const clearCart = useRestaurantStore(state => state.clearCart);
  const refreshOrdersFromApi = useRestaurantStore(state => state.refreshOrdersFromApi);
  const refreshTablesFromApi = useRestaurantStore(state => state.refreshTablesFromApi);
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = notifications.filter((n) => !n.isRead && n.type === 'order_ready').length;
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);


  const filteredTables = useMemo(() => {
    if (filter === 'all') return tables;
    if (filter === 'ready') {
      return tables.filter((table) => {
        const allOrders = getTableAllActiveOrders(table.id);
        return allOrders.some((order) => order.status === 'ready');
      });
    }
    return tables.filter((table) => table.status === filter);
  }, [filter, tables, getTableAllActiveOrders]);

  const handleTablePress = useCallback((table: any) => {
    selectTable(table);

    const allOrders = getTableAllActiveOrders(table.id);
    const latestOrder = [...allOrders].sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    })[0];
    const activeOrder = getTableActiveOrder(table.id) || latestOrder;

    if (activeOrder) {
      if (activeOrder.status === 'billing') {
        // Billing is managed by the manager on the dashboard.
        // Waiter's job is done — show a brief info alert.
        Alert.alert(
          'Bill in Progress',
          'This table is waiting for the manager to process the bill.\n\nYou will be notified once payment is complete.',
          [{ text: 'OK' }]
        );
      } else if (activeOrder.status === 'ready') {
        router.push(`/order/${activeOrder.id}`);
      } else {
        router.push(`/order/${activeOrder.id}`);
      }
    } else {
      clearCart();
      router.push(`/create-order?tableId=${table.id}`);
    }
  }, [selectTable, getTableActiveOrder, getTableAllActiveOrders, clearCart, router]);

  const renderTableCard = useCallback(({ item }: { item: any }) => {
    const activeOrder = getTableActiveOrder(item.id);
    const allOrders = getTableAllActiveOrders(item.id);
    const readyOrderCount = allOrders.filter((order) => order.status === 'ready').length;
    const hasReadyOrder = readyOrderCount > 0;
    const totalItemCount = allOrders.reduce(
      (sum, o) => sum + o.items.reduce((s: number, i: any) => s + i.quantity, 0), 0
    );
    return (
      <TableCard
        table={item}
        activeOrder={activeOrder}
        hasReadyOrder={hasReadyOrder}
        readyOrderCount={readyOrderCount}
        totalItemCount={totalItemCount}
        onPress={() => handleTablePress(item)}
      />
    );
  }, [getTableActiveOrder, getTableAllActiveOrders, handleTablePress]);

  const keyExtractor = useCallback((item: any) => item.id, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshTablesFromApi(), refreshOrdersFromApi()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshOrdersFromApi, refreshTablesFromApi]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Utensils size={20} color="#FF6B35" />
          </View>
          <Text style={styles.headerTitle}>Floor Plan</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.iconButton} onPress={() => setShowNotifications(true)}>
            <Bell size={20} color="#666" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </Pressable>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name
                ? user.name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
                : 'JD'}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        ListHeaderComponent={
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
            data={[
              { key: 'all', label: 'All Tables' },
              { key: 'occupied', label: 'Occupied' },
              { key: 'ready', label: 'Ready' },
              { key: 'billing', label: 'Billing' },
            ]}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.filterChip,
                  filter === item.key && styles.filterChipActive
                ]}
                onPress={() => setFilter(item.key as FilterKey)}
              >
                {item.key === 'all' && filter === item.key && (
                  <View style={styles.gridIcon}>
                    <View style={styles.gridDot} />
                    <View style={styles.gridDot} />
                    <View style={styles.gridDot} />
                    <View style={styles.gridDot} />
                  </View>
                )}
                {item.key === 'occupied' && (
                  <View style={styles.statusDot} />
                )}
                {item.key === 'ready' && (
                  <View style={styles.statusDotReady} />
                )}
                {item.key === 'billing' && (
                  <Receipt size={14} color={filter === item.key ? '#FFF' : '#666'} />
                )}
                <Text
                  style={[
                    styles.filterText,
                    filter === item.key && styles.filterTextActive
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            )}
          />
        }
        data={filteredTables}
        renderItem={renderTableCard}
        keyExtractor={keyExtractor}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />
        }
      />

      <NotificationPanel visible={showNotifications} onClose={() => setShowNotifications(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f7f5'
  },
  content: {
    paddingBottom: 40
  },
  row: {
    gap: 16,
    paddingHorizontal: 16,
    marginBottom: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: 'rgba(248, 247, 245, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  headerIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#F8F7F5'
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700'
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ff6a00',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700'
  },
  filters: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  filterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A'
  },
  filterText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500'
  },
  filterTextActive: {
    color: '#FFF',
    fontWeight: '600'
  },
  gridIcon: {
    width: 20,
    height: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    alignItems: 'center',
    justifyContent: 'center'
  },
  gridDot: {
    width: 3,
    height: 3,
    backgroundColor: '#FFF',
    borderRadius: 1.5
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff6a00'
  },
  statusDotReady: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A'
  },
  checkIcon: {
    fontSize: 16,
    color: '#22C55E',
    fontWeight: '700'
  },
  checkIconActive: {
    color: '#FFF'
  },
  tableCard: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  cardFree: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    shadowOpacity: 0
  },
  cardBilling: {
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.2
  },
  cardReady: {
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOpacity: 0.2
  },
  cardOccupied: {
    backgroundColor: '#ff6a00',
    shadowColor: '#ff6a00',
    shadowOpacity: 0.2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  freeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#CBD5E1',
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  tableNumber: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 38
  },
  tableMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4
  }
});
