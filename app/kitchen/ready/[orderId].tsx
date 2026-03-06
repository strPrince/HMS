import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, RotateCcw, ShoppingBag } from 'lucide-react-native';
import { useRestaurantStore } from '../../../store/useRestaurantStore';

const PRIMARY_GREEN = '#14E45F';
const LIGHT_BACKGROUND = '#F3F5F4';
const TITLE_TEXT = '#0F172A';
const MUTED_TEXT = '#475569';

const getOrderType = (tableId: string, notes?: string) => {
  const text = notes?.toLowerCase() || '';
  if (tableId.startsWith('p') || text.includes('parcel') || text.includes('takeaway')) {
    return 'parcel';
  }
  return 'dine-in';
};

export default function KitchenReadyConfirmation() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { orders, updateOrder } = useRestaurantStore();
  const [seconds, setSeconds] = useState(5);

  const order = orders.find((entry) => entry.id === orderId);

  useEffect(() => {
    if (seconds <= 0) {
      router.replace('/(tabs)/kitchen');
      return;
    }

    const timer = setTimeout(() => {
      setSeconds((current) => current - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [router, seconds]);

  const orderLabel = useMemo(() => orderId?.replace('o', '') || orderId || '', [orderId]);
  const orderType = order ? getOrderType(order.tableId, order.notes) : 'dine-in';

  if (!order) {
    return (
      <View style={styles.notFoundWrap}>
        <Text style={styles.notFoundText}>Order not found</Text>
      </View>
    );
  }

  const undoReady = () => {
    updateOrder(order.id, { status: 'in-kitchen' });
    router.replace(`/(tabs)/kitchen`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.headerIcon} onPress={() => router.replace('/(tabs)/kitchen')}>
          <ArrowLeft size={25} color={TITLE_TEXT} />
        </Pressable>
        <Text style={styles.headerTitle}>Kitchen Display</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.mainWrap}>
        <View style={styles.heroCircle}>
          <Check size={120} color="#FFFFFF" strokeWidth={5} />
        </View>

        <Text style={styles.mainTitle}>
          {orderType === 'parcel' ? `PARCEL ORDER #${orderLabel}` : `ORDER #${orderLabel}`} READY
        </Text>
        <Text style={styles.mainSubtitle}>Waitstaff notified for pickup.</Text>

        <View style={styles.orderTypePill}>
          <ShoppingBag size={15} color="#64748B" />
          <Text style={styles.orderTypeText}>{orderType === 'parcel' ? 'PARCEL / TAKEAWAY' : 'DINE-IN SERVICE'}</Text>
        </View>

        <Pressable style={styles.undoButton} onPress={undoReady}>
          <RotateCcw size={24} color="#334155" />
          <Text style={styles.undoText}>Undo Ready Status</Text>
        </Pressable>

        <View style={styles.timerCard}>
          <Text style={styles.timerTitle}>RETURNING TO ORDERS IN</Text>

          <View style={styles.timerRow}>
            <View style={styles.timeCellMuted}>
              <Text style={styles.timeCellMutedValue}>00</Text>
              <Text style={styles.timeCellLabel}>MIN</Text>
            </View>
            <Text style={styles.timeColon}>:</Text>
            <View style={styles.timeCellGreen}>
              <Text style={styles.timeCellGreenValue}>{String(Math.max(0, seconds)).padStart(2, '0')}</Text>
              <Text style={styles.timeCellLabel}>SEC</Text>
            </View>
          </View>

          <Pressable style={styles.returnNowButton} onPress={() => router.replace('/(tabs)/kitchen')}>
            <Text style={styles.returnNowText}>Return Immediately</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_BACKGROUND,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 22,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    color: TITLE_TEXT,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 42,
  },
  mainWrap: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 24,
  },
  heroCircle: {
    width: 236,
    height: 236,
    borderRadius: 118,
    backgroundColor: '#0FEA1B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A34A',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 20,
    elevation: 10,
  },
  mainTitle: {
    marginTop: 24,
    textAlign: 'center',
    color: TITLE_TEXT,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontSize: 22,
    lineHeight: 30,
    textTransform: 'uppercase',
  },
  mainSubtitle: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#475569',
    fontWeight: '500',
  },
  orderTypePill: {
    marginTop: 26,
    borderRadius: 999,
    backgroundColor: '#E1E7EF',
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderTypeText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  undoButton: {
    marginTop: 22,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    minHeight: 72,
    width: '72%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
  },
  undoText: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  timerCard: {
    marginTop: 24,
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    alignItems: 'center',
  },
  timerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#64748B',
  },
  timerRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeCellMuted: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    width: 92,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#EFF3F8',
  },
  timeCellMutedValue: {
    fontSize: 28,
    lineHeight: 30,
    color: '#0F172A',
    fontWeight: '800',
  },
  timeCellGreen: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
    width: 92,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#DCFCE7',
  },
  timeCellGreenValue: {
    fontSize: 28,
    lineHeight: 30,
    color: '#16A34A',
    fontWeight: '800',
  },
  timeColon: {
    fontSize: 30,
    color: '#94A3B8',
    fontWeight: '700',
  },
  timeCellLabel: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  returnNowButton: {
    marginTop: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  returnNowText: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '700',
  },
});
