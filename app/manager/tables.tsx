import React, { useState, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Pencil, Trash2, X } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useRestaurantStore } from '../../store/useRestaurantStore';

export default function TableManagement() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { tables, addTable, updateTable, deleteTable } = useRestaurantStore();

    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [label, setLabel] = useState('');
    const [seats, setSeats] = useState('4');

    const resetForm = useCallback(() => {
        setShowForm(false);
        setEditId(null);
        setLabel('');
        setSeats('4');
    }, []);

    const handleEdit = useCallback((table: any) => {
        setEditId(table.id);
        setLabel(table.label);
        setSeats(String(table.seats));
        setShowForm(true);
    }, []);

    const handleDelete = useCallback((id: string, tableLabel: string) => {
        Alert.alert('Delete Table', `Remove Table ${tableLabel}?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteTable(id) },
        ]);
    }, [deleteTable]);

    const handleSave = useCallback(() => {
        if (!label.trim()) {
            Alert.alert('Error', 'Table label is required.');
            return;
        }
        const parsedSeats = Number(seats) || 4;

        if (editId) {
            updateTable(editId, { label: label.trim(), seats: parsedSeats });
        } else {
            addTable({
                id: `t${Date.now()}`,
                label: label.trim(),
                seats: parsedSeats,
                status: 'available',
            });
        }
        resetForm();
    }, [editId, label, seats, addTable, updateTable, resetForm]);

    const getStatusColor = (status: string) => {
        if (status === 'available') return colors.success;
        if (status === 'billing') return colors.warning;
        return colors.danger;
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <ArrowLeft size={24} color={colors.text} />
                </Pressable>
                <Text style={styles.title}>Tables ({tables.length})</Text>
                <Pressable style={styles.addButton} onPress={() => { resetForm(); setShowForm(true); }}>
                    <Plus size={20} color="#FFF" />
                </Pressable>
            </View>

            {showForm && (
                <View style={styles.formCard}>
                    <View style={styles.formHeader}>
                        <Text style={styles.formTitle}>{editId ? 'Edit Table' : 'Add Table'}</Text>
                        <Pressable onPress={resetForm}>
                            <X size={20} color={colors.muted} />
                        </Pressable>
                    </View>
                    <TextInput style={styles.input} placeholder="Table label (e.g. 9)" value={label} onChangeText={setLabel} placeholderTextColor={colors.muted} />
                    <TextInput style={styles.input} placeholder="Seats (default 4)" value={seats} onChangeText={setSeats} keyboardType="numeric" placeholderTextColor={colors.muted} />
                    <Pressable style={styles.saveButton} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>{editId ? 'Update' : 'Add Table'}</Text>
                    </Pressable>
                </View>
            )}

            <FlatList
                data={tables}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <View style={styles.tableCard}>
                        <View style={styles.tableIconWrap}>
                            <Text style={styles.tableNumber}>T{item.label}</Text>
                        </View>
                        <View style={styles.tableInfo}>
                            <Text style={styles.tableName}>Table {item.label}</Text>
                            <Text style={styles.tableMeta}>{item.seats} seats</Text>
                        </View>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </Text>
                        <View style={styles.tableActions}>
                            <Pressable style={styles.editBtn} onPress={() => handleEdit(item)}>
                                <Pencil size={16} color={colors.primary} />
                            </Pressable>
                            <Pressable style={styles.deleteBtn} onPress={() => handleDelete(item.id, item.label)}>
                                <Trash2 size={16} color={colors.danger} />
                            </Pressable>
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
    title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textStrong },
    addButton: {
        width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    list: { padding: 16, paddingBottom: 32, gap: 10 },
    tableCard: {
        backgroundColor: colors.surface, borderRadius: 14, padding: 14,
        flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, gap: 10,
    },
    tableIconWrap: {
        width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primarySoft,
        alignItems: 'center', justifyContent: 'center',
    },
    tableNumber: { fontWeight: '700', fontSize: 14, color: colors.primary },
    tableInfo: { flex: 1 },
    tableName: { fontSize: 15, fontWeight: '700', color: colors.textStrong },
    tableMeta: { fontSize: 12, color: colors.mutedDark, marginTop: 2 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 11, fontWeight: '600', marginRight: 4 },
    tableActions: { flexDirection: 'row', gap: 6 },
    editBtn: {
        width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primarySoft,
        alignItems: 'center', justifyContent: 'center',
    },
    deleteBtn: {
        width: 32, height: 32, borderRadius: 8, backgroundColor: '#FCEAEA',
        alignItems: 'center', justifyContent: 'center',
    },
    formCard: {
        margin: 16, backgroundColor: colors.surface, borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: colors.primary, gap: 10,
    },
    formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    formTitle: { fontSize: 16, fontWeight: '700', color: colors.textStrong },
    input: {
        backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 12,
        fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border,
    },
    saveButton: {
        backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12,
        alignItems: 'center', marginTop: 4,
    },
    saveButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
