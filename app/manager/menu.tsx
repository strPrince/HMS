import React, { useState, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Pencil, Trash2, X } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useRestaurantStore } from '../../store/useRestaurantStore';
import { formatCurrency } from '../../utils/helpers';

export default function MenuManagement() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { menuItems, addMenuItem, updateMenuItem, deleteMenuItem } = useRestaurantStore();

    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');

    const resetForm = useCallback(() => {
        setShowForm(false);
        setEditId(null);
        setName('');
        setPrice('');
        setCategory('');
        setDescription('');
    }, []);

    const handleEdit = useCallback((item: any) => {
        setEditId(item.id);
        setName(item.name);
        setPrice(String(item.price));
        setCategory(item.category || '');
        setDescription(item.description || '');
        setShowForm(true);
    }, []);

    const handleDelete = useCallback((id: string, itemName: string) => {
        Alert.alert('Delete Item', `Remove "${itemName}" from the menu?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteMenuItem(id) },
        ]);
    }, [deleteMenuItem]);

    const handleSave = useCallback(() => {
        if (!name.trim() || !price.trim()) {
            Alert.alert('Error', 'Name and price are required.');
            return;
        }
        const parsedPrice = Number(price);
        if (isNaN(parsedPrice) || parsedPrice <= 0) {
            Alert.alert('Error', 'Price must be a valid positive number.');
            return;
        }

        if (editId) {
            updateMenuItem(editId, { name: name.trim(), price: parsedPrice, category: category.trim(), description: description.trim() });
        } else {
            addMenuItem({
                id: `m${Date.now()}`,
                name: name.trim(),
                price: parsedPrice,
                category: category.trim() || undefined,
                description: description.trim() || undefined,
            });
        }
        resetForm();
    }, [editId, name, price, category, description, addMenuItem, updateMenuItem, resetForm]);

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <ArrowLeft size={24} color={colors.text} />
                </Pressable>
                <Text style={styles.title}>Menu Items ({menuItems.length})</Text>
                <Pressable style={styles.addButton} onPress={() => { resetForm(); setShowForm(true); }}>
                    <Plus size={20} color="#FFF" />
                </Pressable>
            </View>

            {showForm && (
                <View style={styles.formCard}>
                    <View style={styles.formHeader}>
                        <Text style={styles.formTitle}>{editId ? 'Edit Item' : 'Add Item'}</Text>
                        <Pressable onPress={resetForm}>
                            <X size={20} color={colors.muted} />
                        </Pressable>
                    </View>
                    <TextInput style={styles.input} placeholder="Item name" value={name} onChangeText={setName} placeholderTextColor={colors.muted} />
                    <TextInput style={styles.input} placeholder="Price (₹)" value={price} onChangeText={setPrice} keyboardType="numeric" placeholderTextColor={colors.muted} />
                    <TextInput style={styles.input} placeholder="Category" value={category} onChangeText={setCategory} placeholderTextColor={colors.muted} />
                    <TextInput style={styles.input} placeholder="Description" value={description} onChangeText={setDescription} multiline placeholderTextColor={colors.muted} />
                    <Pressable style={styles.saveButton} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>{editId ? 'Update' : 'Add Item'}</Text>
                    </Pressable>
                </View>
            )}

            <FlatList
                data={menuItems}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <View style={styles.itemCard}>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemMeta}>
                                {item.category || 'Uncategorized'} • {formatCurrency(item.price)}
                            </Text>
                            {item.description ? <Text style={styles.itemDesc}>{item.description}</Text> : null}
                        </View>
                        <View style={styles.itemActions}>
                            <Pressable style={styles.editBtn} onPress={() => handleEdit(item)}>
                                <Pencil size={16} color={colors.primary} />
                            </Pressable>
                            <Pressable style={styles.deleteBtn} onPress={() => handleDelete(item.id, item.name)}>
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 12,
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
    itemCard: {
        backgroundColor: colors.surface, borderRadius: 14, padding: 14,
        flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 15, fontWeight: '700', color: colors.textStrong },
    itemMeta: { fontSize: 12, color: colors.mutedDark, marginTop: 2 },
    itemDesc: { fontSize: 12, color: colors.muted, marginTop: 4 },
    itemActions: { flexDirection: 'row', gap: 8 },
    editBtn: {
        width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primarySoft,
        alignItems: 'center', justifyContent: 'center',
    },
    deleteBtn: {
        width: 36, height: 36, borderRadius: 10, backgroundColor: '#FCEAEA',
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
