import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/colors';
import { RESTAURANT } from '../../constants/restaurant';
import { useAuth } from '../../providers/AuthProvider';
import { ChevronRight, LogOut, Store, FileText, Crown } from 'lucide-react-native';
import { useRestaurantStore } from '../../store/useRestaurantStore';

export default function Settings() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { menuItems, orders } = useRestaurantStore();
  const billsGenerated = orders.filter((order) => order.status === 'completed').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name ? user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() : 'WT'}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name || 'Waiter'}</Text>
          <View style={styles.roleRow}>
            <View style={styles.roleIcon} />
            <Text style={styles.profileRole}>{user?.role?.toUpperCase() || 'STAFF'}</Text>
          </View>
        </View>
        <ChevronRight size={18} color={colors.mutedDark} />
      </View>

      <Text style={styles.sectionLabel}>RESTAURANT</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Store size={16} color={colors.mutedDark} />
            <Text style={styles.rowLabel}>Name</Text>
          </View>
          <Text style={styles.rowValue}>{RESTAURANT.name}</Text>
        </View>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <FileText size={16} color={colors.mutedDark} />
            <Text style={styles.rowLabel}>GSTIN</Text>
          </View>
          <Text style={styles.rowValue}>{RESTAURANT.gstin}</Text>
        </View>
        <View style={[styles.row, styles.rowLast]}>
          <View style={styles.rowLeft}>
            <Crown size={16} color={colors.mutedDark} />
            <Text style={styles.rowLabel}>Plan</Text>
          </View>
          <View style={styles.planPill}>
            <Text style={styles.planText}>{RESTAURANT.plan}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionLabel}>STATS</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Total Bills Generated</Text>
          <Text style={styles.rowValue}>{billsGenerated}</Text>
        </View>
        <View style={[styles.row, styles.rowLast]}>
          <Text style={styles.rowLabel}>Menu Items</Text>
          <Text style={styles.rowValue}>{menuItems.length}</Text>
        </View>
      </View>

      {user ? (
        <Pressable
          style={styles.logoutButton}
          onPress={() => signOut()}
        >
          <LogOut size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      ) : null}
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textStrong,
    marginBottom: 16
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
    gap: 12
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E9F2FF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontWeight: '700',
    color: '#3B82F6'
  },
  profileInfo: {
    flex: 1
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textStrong
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4
  },
  roleIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6'
  },
  profileRole: {
    fontSize: 11,
    color: colors.mutedDark,
    fontWeight: '700'
  },
  sectionLabel: {
    fontSize: 11,
    color: colors.mutedDark,
    letterSpacing: 0.6,
    marginBottom: 8
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  rowLast: {
    borderBottomWidth: 0
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  rowLabel: {
    fontSize: 13,
    color: colors.mutedDark
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textStrong
  },
  planPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FFEAD5'
  },
  planText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary
  },
  logoutButton: {
    backgroundColor: '#FCEAEA',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger
  }
});
