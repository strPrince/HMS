import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BarChart3, ChefHat, Users, Utensils, DollarSign, Package } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { RESTAURANT } from '../../constants/restaurant';
import { useRestaurantStore } from '../../store/useRestaurantStore';
import { useAuth } from '../../providers/AuthProvider';
import { formatCurrency } from '../../utils/helpers';

export default function ManagerDashboard() {
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { orders, tables, menuItems } = useRestaurantStore();

    const stats = useMemo(() => {
        const today = new Date().toDateString();
        const todayOrders = orders.filter(
            (o) => new Date(o.createdAt).toDateString() === today
        );
        const completedToday = todayOrders.filter((o) => o.status === 'completed');
        const revenue = completedToday.reduce((sum, o) => {
            const items = o.items || [];
            return sum + items.reduce((s, i) => s + (i.quantity || 0) * 100, 0); // approximate
        }, 0);
        const activeTables = tables.filter((t) => t.status === 'occupied' || t.status === 'billing').length;
        const activeOrders = orders.filter((o) => o.status !== 'completed').length;

        return {
            totalOrdersToday: todayOrders.length,
            completedToday: completedToday.length,
            activeTables,
            activeOrders,
            totalTables: tables.length,
            totalMenuItems: menuItems.length,
        };
    }, [orders, tables, menuItems]);

    const quickActions = [
        { label: 'Menu Items', icon: Utensils, route: '/manager/menu', count: stats.totalMenuItems },
        { label: 'Tables', icon: Users, route: '/manager/tables', count: stats.totalTables },
        { label: 'Staff', icon: ChefHat, route: '/manager/staff', count: undefined },
    ] as const;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.greeting}>Hello, {user?.name || 'Manager'} 👋</Text>
                    <Text style={styles.subtext}>{RESTAURANT.name} — Dashboard</Text>
                </View>
                <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>MANAGER</Text>
                </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                <View style={[styles.statCard, styles.statCardPrimary]}>
                    <Package size={20} color="#FFF" />
                    <Text style={styles.statValueLight}>{stats.activeOrders}</Text>
                    <Text style={styles.statLabelLight}>Active Orders</Text>
                </View>
                <View style={styles.statCard}>
                    <BarChart3 size={20} color={colors.primary} />
                    <Text style={styles.statValue}>{stats.totalOrdersToday}</Text>
                    <Text style={styles.statLabel}>Today's Orders</Text>
                </View>
                <View style={styles.statCard}>
                    <Users size={20} color={colors.success} />
                    <Text style={styles.statValue}>{stats.activeTables}/{stats.totalTables}</Text>
                    <Text style={styles.statLabel}>Tables Active</Text>
                </View>
                <View style={styles.statCard}>
                    <DollarSign size={20} color="#8B5CF6" />
                    <Text style={styles.statValue}>{stats.completedToday}</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                </View>
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Manage</Text>
            {quickActions.map((action) => (
                <Pressable
                    key={action.label}
                    style={styles.actionCard}
                    onPress={() => router.push(action.route as any)}
                >
                    <View style={styles.actionIconWrap}>
                        <action.icon size={22} color={colors.primary} />
                    </View>
                    <View style={styles.actionInfo}>
                        <Text style={styles.actionLabel}>{action.label}</Text>
                        {action.count !== undefined && (
                            <Text style={styles.actionCount}>{action.count} items</Text>
                        )}
                    </View>
                    <Text style={styles.actionArrow}>›</Text>
                </Pressable>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 16,
        paddingBottom: 32,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    greeting: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.textStrong,
    },
    subtext: {
        fontSize: 13,
        color: colors.mutedDark,
        marginTop: 2,
    },
    roleBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: '#E0E7FF',
    },
    roleBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#4338CA',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        width: '47%' as any,
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 6,
    },
    statCardPrimary: {
        backgroundColor: colors.primary,
        borderColor: colors.primaryDark,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.textStrong,
    },
    statValueLight: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFF',
    },
    statLabel: {
        fontSize: 12,
        color: colors.mutedDark,
        fontWeight: '500',
    },
    statLabelLight: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.mutedDark,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 12,
    },
    actionCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        gap: 14,
    },
    actionIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionInfo: {
        flex: 1,
    },
    actionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textStrong,
    },
    actionCount: {
        fontSize: 12,
        color: colors.mutedDark,
        marginTop: 2,
    },
    actionArrow: {
        fontSize: 24,
        color: colors.muted,
    },
});
