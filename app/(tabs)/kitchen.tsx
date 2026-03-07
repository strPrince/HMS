import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell,
  ChefHat,
  CheckCircle2,
  Flame,
  Package,
  Wifi,
} from 'lucide-react-native';
import { useRestaurantStore } from '../../store/useRestaurantStore';

type QueueFilter = 'all' | 'dine-in' | 'parcel';
type KitchenStatus = 'open' | 'preparing' | 'ready';

type DecoratedOrder = {
  id: string;
  tableLabel: string;
  orderNumber: string;
  serverName: string;
  elapsedLabel: string;
  elapsedMinutes: number;
  orderType: 'dine-in' | 'parcel';
  status: KitchenStatus;
};

const PRIMARY_GREEN = '#16E45E';
const LIGHT_BACKGROUND = '#F3F5F4';
const CARD_BORDER = '#DEE3E0';
const MUTED_TEXT = '#6B7280';
const TITLE_TEXT = '#0F172A';
const PARCEL_BLUE = '#3B82F6';
const NEW_ORDER_ORANGE = '#FFA500';

const formatElapsed = (createdAt: string, now: number) => {
  const diffMs = Math.max(0, now - new Date(createdAt).getTime());
  const totalMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMins / 60);
  const minutes = totalMins % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};



export default function Kitchen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    orders,
    tables,
    getOrderItems,
    updateOrder,
    markOrderAsReady,
    refreshOrdersFromApi,
    refreshTablesFromApi,
    refreshMenuFromApi,
  } = useRestaurantStore();
  const [filter, setFilter] = useState<QueueFilter>('all');
  const [now, setNow] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== 'completed'),
    [orders]
  );

  const orderSummaries = useMemo<DecoratedOrder[]>(() => {
    return activeOrders
      .map((order) => {
        const table = tables.find((entry) => entry.id === order.tableId);
        const orderType = order.orderType || 'dine-in';
        const status: KitchenStatus =
          order.status === 'ready' ? 'ready' : 'open';
        const elapsedMinutes = Math.max(
          0,
          Math.floor((now - new Date(order.createdAt).getTime()) / 60000)
        );

        return {
          id: order.id,
          tableLabel: table?.label || order.tableId.replace('t', ''),
          orderNumber: order.id.replace('o', ''),
          serverName: 'Server',
          elapsedLabel: formatElapsed(order.createdAt, now),
          elapsedMinutes,
          orderType,
          status,
        };
      })
      .sort((a, b) => {
        if (a.status !== b.status) {
          const rank: Record<KitchenStatus, number> = { open: 0, preparing: 1, ready: 2 };
          return rank[a.status] - rank[b.status];
        }
        return b.elapsedMinutes - a.elapsedMinutes;
      });
  }, [activeOrders, now, tables]);

  const dineInCount = useMemo(
    () => orderSummaries.filter((order) => order.orderType === 'dine-in').length,
    [orderSummaries]
  );

  const parcelCount = useMemo(
    () => orderSummaries.filter((order) => order.orderType === 'parcel').length,
    [orderSummaries]
  );

  const filteredOrders = useMemo(() => {
    if (filter === 'all') return orderSummaries;
    return orderSummaries.filter((order) => order.orderType === filter);
  }, [filter, orderSummaries]);

  const handleOpenOrder = (orderId: string) => {
    router.push(`/kitchen/order/${orderId}`);
  };

  const handleMarkReady = async (orderId: string) => {
    if (markingId) return; // prevent double-tap
    setMarkingId(orderId);
    try {
      await markOrderAsReady(orderId);
    } catch (error) {
      console.warn('[Kitchen] handleMarkReady API failed:', error);
      // Optimistic update already applied by markOrderAsReady
    } finally {
      setMarkingId(null);
    }
    router.push(`/kitchen/ready/${orderId}`);
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
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <View style={styles.brandWrap}>
            <View style={styles.logoBubble}>
              <ChefHat size={18} color={PRIMARY_GREEN} />
            </View>
            <View>
              <Text style={styles.title}>Kitchen Display</Text>
              <Text style={styles.subtitle}>Shift: Lunch • {orderSummaries.length} Active Orders</Text>
            </View>
          </View>
          <View style={styles.headerIcons}>
            <Pressable style={styles.iconButton}>
              <Bell size={18} color="#374151" />
            </Pressable>
            <Pressable style={styles.iconButton}>
              <Wifi size={18} color="#374151" />
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <FilterPill
            label={`All (${orderSummaries.length})`}
            active={filter === 'all'}
            onPress={() => setFilter('all')}
          />
          <FilterPill
            label={`Dine-in (${dineInCount})`}
            active={filter === 'dine-in'}
            onPress={() => setFilter('dine-in')}
          />
          <FilterPill
            label={`Parcel (${parcelCount})`}
            active={filter === 'parcel'}
            onPress={() => setFilter('parcel')}
          />
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY_GREEN} />
        }
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Package size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No active orders</Text>
            <Text style={styles.emptyText}>Orders will appear here as soon as they are received.</Text>
          </View>
        ) : (
          filteredOrders.map((summary) => {
            const sourceOrder = orders.find((entry) => entry.id === summary.id);
            if (!sourceOrder) return null;

            const isNew = summary.status === 'open';
            const isUrgent = summary.elapsedMinutes >= 15;
            const items = getOrderItems(summary.id);

            return (
              <View key={summary.id} style={[styles.card, isNew && styles.cardNew]}>
                <Pressable onPress={() => handleOpenOrder(summary.id)}>
                  {isNew ? (
                    <View style={styles.newBar}>
                      <View style={styles.newOrderLabel}>
                        <Flame size={12} color="#111827" />
                        <Text style={styles.newOrderText}>NEW ORDER</Text>
                      </View>
                      <Text style={styles.newOrderCode}>#{summary.orderNumber}</Text>
                    </View>
                  ) : null}

                  <View style={styles.cardTop}>
                    <View>
                      <View
                        style={[
                          styles.typeChip,
                          summary.orderType === 'parcel' ? styles.typeChipParcel : styles.typeChipDine,
                        ]}
                      >
                        {summary.orderType === 'parcel' ? (
                          <Package size={12} color={PARCEL_BLUE} />
                        ) : (
                          <ChefHat size={12} color={NEW_ORDER_ORANGE} />
                        )}
                        <Text
                          style={[
                            styles.typeChipText,
                            summary.orderType === 'parcel'
                              ? styles.typeChipTextParcel
                              : styles.typeChipTextDine,
                          ]}
                        >
                          {summary.orderType === 'parcel' ? 'Parcel' : 'Dine-in'}
                        </Text>
                      </View>
                      <Text style={styles.tableTitle}>
                        {summary.orderType === 'parcel' ? `Order #${summary.orderNumber}` : `Table ${summary.tableLabel}`}
                      </Text>
                      <Text style={styles.serverText}>
                        {summary.orderType === 'parcel' ? 'Pickup • Awaiting runner' : `Server: ${summary.serverName}`}
                      </Text>
                    </View>

                    <View style={styles.elapsedWrap}>
                      <Text style={[styles.elapsedValue, isUrgent && styles.elapsedValueUrgent]}>
                        {summary.elapsedLabel}
                      </Text>
                      <Text style={styles.elapsedCaption}>elapsed</Text>
                    </View>
                  </View>

                  <View style={styles.itemsWrap}>
                    {items.map(({ item, quantity }) => {
                      const itemStatus = sourceOrder.items.find((line) => line.itemId === item.id)?.status;
                      return (
                        <View
                          key={`${summary.id}-${item.id}`}
                          style={[styles.itemRow, itemStatus === 'ready' && styles.itemRowReady]}
                        >
                          <View style={styles.qtyBox}>
                            <Text style={styles.qtyText}>{quantity}</Text>
                          </View>
                          <View style={styles.itemInfo}>
                            <View style={styles.itemNameRow}>
                              <Text style={styles.itemName}>{item.name}</Text>
                              {itemStatus === 'ready' ? (
                                <CheckCircle2 size={14} color={PRIMARY_GREEN} />
                              ) : null}
                            </View>
                            {sourceOrder.notes ? <Text style={styles.notePill}>{sourceOrder.notes}</Text> : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </Pressable>

                <Pressable
                  style={[styles.readyButton, markingId === summary.id && { opacity: 0.6 }]}
                  onPress={() => handleMarkReady(summary.id)}
                  disabled={!!markingId}
                >
                  <CheckCircle2 size={20} color="#052E16" />
                  <Text style={styles.readyButtonText}>
                    {markingId === summary.id ? 'Updating...' : 'Mark Order Ready'}
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

type FilterPillProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function FilterPill({ label, active, onPress }: FilterPillProps) {
  return (
    <Pressable style={[styles.pill, active && styles.pillActive]} onPress={onPress}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_BACKGROUND,
  },
  headerWrap: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandWrap: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    flex: 1,
  },
  logoBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DDFBE9',
  },
  title: {
    color: TITLE_TEXT,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: MUTED_TEXT,
    fontWeight: '500',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  pillActive: {
    backgroundColor: PRIMARY_GREEN,
    borderColor: PRIMARY_GREEN,
  },
  pillText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#052E16',
    fontWeight: '700',
  },
  content: {
    padding: 14,
    paddingBottom: 28,
    gap: 12,
  },
  emptyWrap: {
    marginTop: 28,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 18,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TITLE_TEXT,
  },
  emptyText: {
    fontSize: 13,
    color: MUTED_TEXT,
    textAlign: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  cardNew: {
    borderColor: NEW_ORDER_ORANGE,
    borderWidth: 2,
  },
  newBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: NEW_ORDER_ORANGE,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  newOrderLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  newOrderText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#111827',
  },
  newOrderCode: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    backgroundColor: '#FFE3B0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0EF',
    gap: 10,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeChipDine: {
    borderColor: NEW_ORDER_ORANGE,
    backgroundColor: '#FFF8EC',
  },
  typeChipParcel: {
    borderColor: PARCEL_BLUE,
    backgroundColor: '#ECF4FF',
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  typeChipTextDine: {
    color: '#C76B00',
  },
  typeChipTextParcel: {
    color: PARCEL_BLUE,
  },
  tableTitle: {
    marginTop: 6,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
    color: TITLE_TEXT,
    letterSpacing: -0.5,
  },
  serverText: {
    marginTop: 4,
    color: MUTED_TEXT,
    fontSize: 14,
    fontWeight: '500',
  },
  elapsedWrap: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  elapsedValue: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#0F172A',
  },
  elapsedValueUrgent: {
    color: '#EF4444',
  },
  elapsedCaption: {
    marginTop: 4,
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  itemsWrap: {
    backgroundColor: '#FFFFFF',
  },
  itemRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0EF',
  },
  itemRowReady: {
    backgroundColor: '#ECFDF3',
  },
  qtyBox: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#E9EBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
    color: '#111827',
  },
  itemInfo: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemName: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
  },
  notePill: {
    marginTop: 8,
    alignSelf: 'flex-start',
    fontSize: 13,
    color: '#374151',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  readyButton: {
    margin: 14,
    borderRadius: 12,
    backgroundColor: PRIMARY_GREEN,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  readyButtonText: {
    color: '#052E16',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
