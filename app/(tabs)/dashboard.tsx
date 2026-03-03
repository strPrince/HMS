import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { useRestaurantStore } from '../../store/useRestaurantStore';
import { formatCurrency } from '../../utils/helpers';
import { useAuth } from '../../providers/AuthProvider';

export default function Dashboard() {
  const { orders, tables, menuItems, getOrderTotal } = useRestaurantStore();
  const { user } = useAuth();

  const closedOrders = orders.filter((order) => order.status === 'closed');
  const activeOrders = orders.filter((order) => order.status !== 'closed');
  const revenue = closedOrders.reduce((sum, order) => sum + getOrderTotal(order.id), 0);
  const avgTicket = closedOrders.length ? revenue / closedOrders.length : 0;
  const occupiedCount = tables.filter((table) => table.status === 'occupied').length;
  const readyCount = tables.filter((table) => table.status === 'ready').length;

  const topItems = menuItems
    .map((item) => {
      const qty = orders.reduce((sum, order) => {
        return (
          sum +
          order.items
            .filter((line) => line.itemId === item.id)
            .reduce((lineSum, line) => lineSum + line.quantity, 0)
        );
      }, 0);
      return { name: item.name, qty };
    })
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 3);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.kicker}>Manager Overview</Text>
      <Text style={styles.title}>Welcome, {user?.name || 'Manager'}</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Revenue</Text>
          <Text style={styles.statValue}>{formatCurrency(revenue)}</Text>
          <Text style={styles.statSub}>Avg ticket {formatCurrency(avgTicket)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Active Orders</Text>
          <Text style={styles.statValue}>{activeOrders.length}</Text>
          <Text style={styles.statSub}>Closed {closedOrders.length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Tables</Text>
          <Text style={styles.statValue}>{occupiedCount}/{tables.length}</Text>
          <Text style={styles.statSub}>{readyCount} ready</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Live Tables</Text>
        <View style={styles.tableGrid}>
          {tables.map((table) => (
            <View key={table.id} style={styles.tableTile}>
              <Text style={styles.tableNumber}>T{table.label}</Text>
              <Text style={styles.tableStatus}>{table.status.toUpperCase()}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Items Today</Text>
        <View style={styles.listCard}>
          {topItems.map((item) => (
            <View key={item.name} style={styles.listRow}>
              <Text style={styles.listText}>{item.name}</Text>
              <Text style={styles.listValue}>{item.qty} orders</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
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
  kicker: {
    fontSize: 12,
    color: colors.mutedDark,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textStrong,
    marginTop: 4,
    marginBottom: 16
  },
  statsGrid: {
    gap: 12
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border
  },
  statLabel: {
    fontSize: 12,
    color: colors.mutedDark
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textStrong,
    marginTop: 6
  },
  statSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 4
  },
  section: {
    marginTop: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textStrong,
    marginBottom: 12
  },
  tableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  tableTile: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  tableNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textStrong
  },
  tableStatus: {
    fontSize: 10,
    color: colors.mutedDark,
    marginTop: 4
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  listText: {
    fontSize: 13,
    color: colors.textStrong
  },
  listValue: {
    fontSize: 12,
    color: colors.mutedDark
  }
});
