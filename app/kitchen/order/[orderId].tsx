import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  Printer,
} from 'lucide-react-native';
import { useRestaurantStore } from '../../../store/useRestaurantStore';

const PRIMARY_GREEN = '#14E45F';
const LIGHT_BACKGROUND = '#F3F5F4';
const TITLE_TEXT = '#0F172A';
const MUTED_TEXT = '#64748B';

const formatElapsed = (createdAt: string, nowMs: number) => {
  const diffMs = Math.max(0, nowMs - new Date(createdAt).getTime());
  const totalMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const formatOrderTime = (createdAt: string) => {
  return new Date(createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const getOrderType = (tableId: string, notes?: string) => {
  const text = notes?.toLowerCase() || '';
  if (tableId.startsWith('p') || text.includes('parcel') || text.includes('takeaway')) {
    return 'parcel';
  }
  return 'dine-in';
};

const toReadable = (value: unknown): string => {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (ch) => ch.toUpperCase());
};

const getItemInstructionText = (line: any): string | null => {
  if (!line) return null;

  const notes = String(line.specialInstructions || line?.customizations?.notes || '').trim();
  const spice = String(line.spiceLevel || line?.customizations?.spiceLevel || '').trim();
  const diet = String(line.dietPreference || line?.customizations?.dietPreference || '').trim();

  const parts: string[] = [];
  if (spice) parts.push(`Spice: ${toReadable(spice)}`);
  if (diet) parts.push(`Diet: ${toReadable(diet)}`);
  if (notes) parts.push(`Note: ${notes}`);

  return parts.length ? parts.join(' • ') : null;
};

export default function KitchenOrderPrep() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orders, tables, getOrderItems, updateOrder, markOrderAsReady } = useRestaurantStore();
  const [now, setNow] = useState(Date.now());
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const order = orders.find((entry) => entry.id === orderId);

  const table = useMemo(
    () => tables.find((entry) => entry.id === order?.tableId),
    [order?.tableId, tables]
  );

  if (!order) {
    return (
      <View style={styles.notFoundWrap}>
        <Text style={styles.notFoundText}>Order not found</Text>
      </View>
    );
  }

  const items = getOrderItems(order.id);
  const orderType = getOrderType(order.tableId, order.notes);
  const orderNumber = order.id.replace('o', '');
  const tableLabel = table?.label || order.tableId.replace('t', '');
  const elapsed = formatElapsed(order.createdAt, now);
  const timeIn = formatOrderTime(order.createdAt);
  const guests = table?.guests || table?.seats || 0;

  const toggleItem = (itemId: string) => {
    updateOrder(order.id, {
      items: order.items.map((line) =>
        line.itemId === itemId
          ? { ...line, status: line.status === 'ready' ? 'new' : 'ready' }
          : line
      ),
    });
  };

  const allReady = order.items.every((line) => line.status === 'ready');

  const markAllReady = async () => {
    if (marking) return;
    setMarking(true);
    try {
      await markOrderAsReady(order.id);
      router.push(`/kitchen/ready/${order.id}`);
    } catch (error) {
      console.warn('[Kitchen] markAllReady API failed:', error);
      // Optimistic update already applied by store — navigate anyway
      router.push(`/kitchen/ready/${order.id}`);
    } finally {
      setMarking(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable style={styles.roundIcon} onPress={() => router.back()}>
          <ArrowLeft size={24} color={TITLE_TEXT} />
        </Pressable>

        <View style={styles.headerCenter}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>
              {orderType === 'parcel' ? `ORDER #${orderNumber}` : `TABLE ${tableLabel}`}
            </Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{orderType === 'parcel' ? 'PARCEL' : 'DINE-IN'}</Text>
            </View>
          </View>
          <Text style={styles.headerSub}>Order #{orderNumber} • Just now</Text>
        </View>

        <Pressable style={styles.printButton}>
          <Printer size={20} color="#0B7C34" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsGrid}>
          <StatCell label="Server" value="Service Team" />
          <StatCell label="Time In" value={timeIn} />
          <StatCell label="Guests" value={String(guests)} />
          <StatCell label="Timer" value={elapsed} accent />
        </View>

        {order.notes ? (
          <View style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <AlertTriangle size={16} color="#B45309" />
              <Text style={styles.alertTitle}>Kitchen Attention</Text>
            </View>
            <Text style={styles.alertBody}>{order.notes}</Text>
          </View>
        ) : null}

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>STATUS LOG</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusMarkerWrap}>
              <View style={[styles.statusDot, styles.statusDotActive]} />
              <View style={styles.statusLine} />
            </View>
            <View>
              <Text style={styles.statusPrimary}>Cooking</Text>
              <Text style={styles.statusSecondary}>Started {elapsed} ago</Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <View style={styles.statusMarkerWrap}>
              <View style={styles.statusDotMuted} />
            </View>
            <View>
              <Text style={styles.statusPrimaryMuted}>Order Received</Text>
              <Text style={styles.statusSecondary}>{timeIn}</Text>
            </View>
          </View>
        </View>

        <View style={styles.itemsHeader}>
          <Text style={styles.itemsTitle}>Items ({items.length})</Text>
          <View style={styles.courseChip}>
            <Text style={styles.courseChipText}>Course 1</Text>
          </View>
        </View>

        <View style={styles.itemsWrap}>
          {items.map(({ item, quantity }) => {
            const line = order.items.find((entry) => entry.itemId === item.id);
            const ready = line?.status === 'ready';
            const itemInstruction = getItemInstructionText(line);

            return (
              <View key={item.id} style={[styles.itemCard, ready && styles.itemCardDone]}>
                <View style={styles.itemMain}>
                  <View style={[styles.qtyCard, ready && styles.qtyCardDone]}>
                    {ready ? (
                      <Check size={24} color="#16A34A" />
                    ) : (
                      <Text style={styles.qtyValue}>{quantity}</Text>
                    )}
                  </View>

                  <View style={styles.itemTextWrap}>
                    <Text style={[styles.itemName, ready && styles.itemNameDone]}>
                      {quantity}x {item.name}
                    </Text>
                    {item.category ? <Text style={styles.categoryTag}>{item.category}</Text> : null}
                    {itemInstruction ? <Text style={styles.itemInstruction}>{itemInstruction}</Text> : null}
                    {ready ? <Text style={styles.readyTag}>READY</Text> : null}
                  </View>
                </View>

                <Pressable style={styles.itemToggle} onPress={() => toggleItem(item.id)}>
                  {ready ? <CheckCircle2 size={26} color={PRIMARY_GREEN} /> : <Circle size={26} color="#CBD5E1" />}
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 18) }]}>
        <Pressable
          style={[styles.markAllButton, marking && { opacity: 0.6 }]}
          onPress={markAllReady}
          disabled={marking}
        >
          <CheckCircle2 size={24} color="#052E16" />
          <Text style={styles.markAllText}>{marking ? 'Updating...' : allReady ? 'Order Ready' : 'Mark All Ready'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

type StatCellProps = {
  label: string;
  value: string;
  accent?: boolean;
};

function StatCell({ label, value, accent }: StatCellProps) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_BACKGROUND,
  },
  notFoundWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LIGHT_BACKGROUND,
  },
  notFoundText: {
    fontSize: 16,
    color: MUTED_TEXT,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DAE5DE',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roundIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    color: TITLE_TEXT,
    letterSpacing: -0.4,
  },
  typeBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.6,
  },
  headerSub: {
    fontSize: 15,
    color: MUTED_TEXT,
    marginTop: 2,
    fontWeight: '500',
  },
  printButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DDF5E4',
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 130,
  },
  statsGrid: {
    borderWidth: 1,
    borderColor: '#D6E4DC',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statCell: {
    width: '50%',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#D6E4DC',
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 90,
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: MUTED_TEXT,
    fontWeight: '700',
  },
  statValue: {
    marginTop: 8,
    fontSize: 22,
    lineHeight: 26,
    color: TITLE_TEXT,
    fontWeight: '800',
  },
  statValueAccent: {
    color: '#D97706',
  },
  alertCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderLeftWidth: 4,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    padding: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertTitle: {
    color: '#B45309',
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  alertBody: {
    marginTop: 8,
    fontSize: 16,
    color: '#111827',
    lineHeight: 23,
    fontWeight: '500',
  },
  statusCard: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DAE5DE',
    padding: 14,
    gap: 10,
  },
  statusTitle: {
    fontSize: 16,
    color: MUTED_TEXT,
    letterSpacing: 0.8,
    fontWeight: '800',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statusMarkerWrap: {
    alignItems: 'center',
    width: 18,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#CBD5E1',
  },
  statusDotActive: {
    backgroundColor: PRIMARY_GREEN,
  },
  statusDotMuted: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#CBD5E1',
  },
  statusLine: {
    width: 2,
    height: 28,
    backgroundColor: '#D1FAE5',
    marginTop: 4,
  },
  statusPrimary: {
    fontSize: 15,
    color: '#16A34A',
    fontWeight: '700',
  },
  statusPrimaryMuted: {
    fontSize: 15,
    color: TITLE_TEXT,
    fontWeight: '700',
  },
  statusSecondary: {
    marginTop: 2,
    fontSize: 14,
    color: MUTED_TEXT,
  },
  itemsHeader: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemsTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    color: TITLE_TEXT,
  },
  courseChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  courseChipText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  itemsWrap: {
    marginTop: 12,
    gap: 12,
  },
  itemCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DAE5DE',
    borderLeftWidth: 5,
    borderLeftColor: PRIMARY_GREEN,
    backgroundColor: '#FFFFFF',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  itemCardDone: {
    opacity: 0.7,
    borderLeftColor: '#86EFAC',
  },
  itemMain: {
    flexDirection: 'row',
    gap: 10,
    flex: 1,
  },
  qtyCard: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: PRIMARY_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  qtyCardDone: {
    borderColor: '#86EFAC',
    backgroundColor: '#DCFCE7',
  },
  qtyValue: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '800',
    color: '#16A34A',
  },
  itemTextWrap: {
    flex: 1,
    gap: 6,
  },
  itemName: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    color: TITLE_TEXT,
  },
  itemNameDone: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  categoryTag: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  itemInstruction: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  readyTag: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#16A34A',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  itemToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 18,
    backgroundColor: 'rgba(243,245,244,0.95)',
    borderTopWidth: 1,
    borderTopColor: '#DDE3DF',
  },
  markAllButton: {
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: PRIMARY_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  markAllText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#052E16',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
