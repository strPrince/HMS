import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { staffProfiles } from '../../mocks/staff-data';

export default function StaffList() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const getRoleColor = (role: string) => {
        if (role === 'manager') return '#4338CA';
        if (role === 'kitchen') return '#059669';
        return '#D97706';
    };

    const getRoleBg = (role: string) => {
        if (role === 'manager') return '#E0E7FF';
        if (role === 'kitchen') return '#D1FAE5';
        return '#FEF3C7';
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <ArrowLeft size={24} color={colors.text} />
                </Pressable>
                <Text style={styles.title}>Staff ({staffProfiles.length})</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={staffProfiles}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <View style={styles.staffCard}>
                        <View style={[styles.avatar, { backgroundColor: item.avatarBg || '#E5E7EB' }]}>
                            <Text style={[styles.avatarText, { color: item.color || colors.text }]}>{item.initials}</Text>
                        </View>
                        <View style={styles.staffInfo}>
                            <Text style={styles.staffName}>{item.name}</Text>
                            <View style={[styles.rolePill, { backgroundColor: getRoleBg(item.role) }]}>
                                <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>
                                    {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12,
        backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12,
    },
    backButton: {
        width: 40, height: 40, borderRadius: 10, backgroundColor: colors.surfaceAlt,
        alignItems: 'center', justifyContent: 'center',
    },
    title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textStrong, textAlign: 'center' },
    list: { padding: 16, paddingBottom: 32, gap: 10 },
    staffCard: {
        backgroundColor: colors.surface, borderRadius: 14, padding: 14,
        flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, gap: 14,
    },
    avatar: {
        width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 16, fontWeight: '700' },
    staffInfo: { flex: 1, gap: 4 },
    staffName: { fontSize: 15, fontWeight: '700', color: colors.textStrong },
    rolePill: {
        alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999,
    },
    roleText: { fontSize: 11, fontWeight: '700' },
});
