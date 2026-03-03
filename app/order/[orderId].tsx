import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Printer } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useRestaurantStore } from '../../store/useRestaurantStore';
import { formatCurrency, formatTimeAgo } from '../../utils/helpers';
import { useAuth } from '../../providers/AuthProvider';

export default function OrderDetails() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { orders, tables, getOrderItems, getOrderTotal, selectTable } = useRestaurantStore();
  const router = useRouter();
  const { user } = useAuth();

  const order = orders.find((o) => o.id === orderId);

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
  const subtotal = getOrderTotal(order.id);
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
    router.push('/create-order');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.textStrong} />
          </Pressable>
          <Text style={styles.title}>Order #{order.id.replace('o', '')}</Text>
          <Pressable style={styles.iconButton}>
            <Printer size={18} color={colors.textStrong} />
          </Pressable>
        </View>

        <Text style={styles.subTitle}>Table {tableLabel} • Dine In</Text>

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
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, styles.statusDotActive]} />
            <View style={styles.statusContent}>
              <Text style={styles.statusTextPrimary}>Cooking</Text>
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

        <Text style={styles.sectionTitle}>Items ({items.length})</Text>
        <View style={styles.itemCard}>
          {items.map(({ item, quantity }) => (
            <View key={item.id} style={styles.itemLine}>
              <View style={styles.itemAccent} />
              <Text style={styles.itemLineText}>{quantity}x {item.name}</Text>
            </View>
          ))}
        </View>

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

        <Pressable style={styles.addButton} onPress={handleAddMore}>
          <Text style={styles.addButtonText}>＋ Add More Items</Text>
        </Pressable>
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
    alignItems: 'center'
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary
  }
});
