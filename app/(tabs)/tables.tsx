import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Users, Utensils } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useRestaurantStore } from '../../store/useRestaurantStore';
import { formatDuration } from '../../utils/helpers';
import { useAuth } from '../../providers/AuthProvider';

type FilterKey = 'all' | 'occupied' | 'ready';

export default function Tables() {
  const { tables, orders, selectTable } = useRestaurantStore();
  const { user } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('all');

  const filteredTables = useMemo(() => {
    if (filter === 'all') return tables;
    return tables.filter((table) => table.status === filter);
  }, [filter, tables]);

  const handleTablePress = (table: typeof tables[number]) => {
    selectTable(table);
    if (table.status === 'free') {
      router.push('/create-order');
      return;
    }
    const activeOrder = orders.find(
      (order) => order.tableId === table.id && order.status !== 'closed'
    );
    if (activeOrder) {
      router.push(`/order/${activeOrder.id}`);
      return;
    }
    router.push('/create-order');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Utensils size={18} color={colors.primary} />
            </View>
            <Text style={styles.headerTitle}>Floor Plan</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable style={styles.iconButton}>
              <Bell size={18} color={colors.textStrong} />
            </Pressable>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.initials || 'WT'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.filters}>
          {[
            { key: 'all', label: 'All Tables' },
            { key: 'occupied', label: 'Occupied' },
            { key: 'ready', label: 'Food Ready' },
          ].map((item) => (
            <Pressable
              key={item.key}
              style={[
                styles.filterChip,
                filter === item.key && styles.filterChipActive
              ]}
              onPress={() => setFilter(item.key as FilterKey)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === item.key && styles.filterTextActive
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.grid}>
          {filteredTables.map((table) => {
            const isFree = table.status === 'free';
            const isReady = table.status === 'ready';
            const cardStyle = isFree
              ? styles.cardFree
              : isReady
              ? styles.cardReady
              : styles.cardOccupied;
            const badgeStyle = isFree
              ? styles.badgeFree
              : isReady
              ? styles.badgeReady
              : styles.badgeOccupied;
            const textColor = isFree ? colors.mutedDark : colors.surface;

            return (
              <Pressable
                key={table.id}
                style={[styles.tableCard, cardStyle]}
                onPress={() => handleTablePress(table)}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.badge, badgeStyle]}>
                    <Text style={[styles.badgeText, { color: textColor }]}>
                      {table.status.toUpperCase()}
                    </Text>
                  </View>
                  {isReady ? (
                    <Bell size={16} color={colors.surface} />
                  ) : table.status === 'occupied' ? (
                    <Users size={16} color={colors.surface} />
                  ) : null}
                </View>
                <Text style={[styles.tableNumber, { color: textColor }]}>
                  {table.label}
                </Text>
                {!isFree ? (
                  <Text style={[styles.tableMeta, { color: textColor }]}>
                    {table.guests || 0} Guests · {formatDuration(table.elapsedMinutes)}
                  </Text>
                ) : (
                  <Text style={styles.freeMeta}>Tap to order</Text>
                )}
              </Pressable>
            );
          })}
        </View>
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textStrong
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700'
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
    backgroundColor: colors.textStrong,
    borderColor: colors.textStrong
  },
  filterText: {
    fontSize: 12,
    color: colors.mutedDark,
    fontWeight: '600'
  },
  filterTextActive: {
    color: colors.surface
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14
  },
  tableCard: {
    width: '47%',
    borderRadius: 18,
    padding: 16,
    minHeight: 140
  },
  cardFree: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border
  },
  cardReady: {
    backgroundColor: colors.success
  },
  cardOccupied: {
    backgroundColor: colors.primary
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999
  },
  badgeFree: {
    backgroundColor: colors.surfaceAlt
  },
  badgeReady: {
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  badgeOccupied: {
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700'
  },
  tableNumber: {
    fontSize: 30,
    fontWeight: '800',
    marginTop: 12
  },
  tableMeta: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600'
  },
  freeMeta: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
    color: colors.mutedDark
  }
});
