import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, RefreshControl } from 'react-native';
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
import { useNotificationStore } from '../../store/useNotificationStore';
import { NotificationPanel } from '../../components/NotificationPanel';
import { formatElapsed, getItemInstructionText } from '../../utils/kitchen.helpers';
import { styles, PRIMARY_GREEN } from './kitchenStyles';

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

const PARCEL_BLUE = '#3B82F6';
const NEW_ORDER_ORANGE = '#FFA500';
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
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = notifications.filter((n) => !n.isRead && n.type === 'order_placed').length;
  const [filter, setFilter] = useState<QueueFilter>('all');
  const [now, setNow] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Only show orders the kitchen needs to act on — not ready, served, billing, completed, cancelled
  const kitchenStatuses = ['pending', 'confirmed', 'in-kitchen', 'preparing'];
  const activeOrders = useMemo(
    () => orders.filter((order) => kitchenStatuses.includes(order.status)),
    [orders]
  );

  const orderSummaries = useMemo<DecoratedOrder[]>(() => {
    return activeOrders
      .map((order) => {
        const table = tables.find((entry) => entry.id === order.tableId);
        const orderType = order.orderType || 'dine-in';
        const status: KitchenStatus =
          order.status === 'preparing' ? 'preparing' : 'open';
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
            <Pressable style={styles.iconButton} onPress={() => setShowNotifications(true)}>
              <Bell size={18} color="#374151" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
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
                      const line = sourceOrder.items.find((entry) => entry.itemId === item.id);
                      const itemStatus = line?.status;
                      const itemInstruction = getItemInstructionText(line);
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
                            {itemInstruction ? <Text style={styles.itemInstruction}>{itemInstruction}</Text> : null}
                            {sourceOrder.notes ? <Text style={styles.notePill}>{sourceOrder.notes}</Text> : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </Pressable>

                {summary.status !== 'ready' && (
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
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <NotificationPanel visible={showNotifications} onClose={() => setShowNotifications(false)} />
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

