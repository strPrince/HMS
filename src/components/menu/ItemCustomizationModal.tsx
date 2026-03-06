import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Plus, Minus } from 'lucide-react-native';
import { formatCurrency } from '../../utils/formatCurrency';

type ItemCustomizationModalProps = {
  visible: boolean;
  onClose: () => void;
  onAddToOrder: (quantity: number, customizations: any) => void;
  itemName: string;
  itemDescription?: string;
  itemPrice: number;
};

export default function ItemCustomizationModal({
  visible,
  onClose,
  onAddToOrder,
  itemName,
  itemDescription,
  itemPrice
}: ItemCustomizationModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [spiceLevel, setSpiceLevel] = useState<'mild' | 'medium' | 'spicy' | null>(null);
  const [dietPreference, setDietPreference] = useState<'regular' | 'jain' | 'no-onion' | 'no-garlic'>('regular');
  const [notes, setNotes] = useState('');

  const handleAdd = () => {
    if (!spiceLevel) return; // Required field

    onAddToOrder(quantity, {
      spiceLevel,
      dietPreference,
      notes
    });
    // Reset state
    setQuantity(1);
    setSpiceLevel(null);
    setDietPreference('regular');
    setNotes('');
  };

  const total = itemPrice * quantity;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.overlayTouchable} onPress={onClose} />
        <View style={styles.modalContainer}>
          {/* Drag Handle */}
          <View style={styles.dragHandle}>
            <View style={styles.dragBar} />
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerInfo}>
                <Text style={styles.itemName}>{itemName}</Text>
                {itemDescription && (
                  <Text style={styles.itemDescription}>{itemDescription}</Text>
                )}
              </View>
              <Text style={styles.itemPrice}>{formatCurrency(itemPrice)}</Text>
            </View>

            {/* Spice Level */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Spice Level</Text>
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredText}>Required</Text>
                </View>
              </View>
              <View style={styles.chipRow}>
                {(['mild', 'medium', 'spicy'] as const).map((level) => (
                  <Pressable
                    key={level}
                    style={[
                      styles.chip,
                      spiceLevel === level && styles.chipActive
                    ]}
                    onPress={() => setSpiceLevel(level)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        spiceLevel === level && styles.chipTextActive
                      ]}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Diet Preference */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Diet Preference</Text>
                <Text style={styles.optionalText}>Optional</Text>
              </View>
              <View style={styles.chipRow}>
                {(['regular', 'jain', 'no-onion', 'no-garlic'] as const).map((pref) => (
                  <Pressable
                    key={pref}
                    style={[
                      styles.chip,
                      dietPreference === pref && styles.chipActive
                    ]}
                    onPress={() => setDietPreference(pref)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        dietPreference === pref && styles.chipTextActive
                      ]}
                    >
                      {pref.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Optional Notes</Text>
              <View style={styles.textInputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Add special instructions for the kitchen..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={notes}
                  onChangeText={setNotes}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Quantity */}
            <View style={styles.quantitySection}>
              <Text style={styles.quantityLabel}>Quantity</Text>
              <View style={styles.quantityControl}>
                <Pressable
                  style={styles.quantityButton}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus size={20} color="#64748B" />
                </Pressable>
                <Text style={styles.quantityNumber}>{quantity}</Text>
                <Pressable
                  style={[styles.quantityButton, styles.quantityButtonPlus]}
                  onPress={() => setQuantity(quantity + 1)}
                >
                  <Plus size={20} color="#FFF" />
                </Pressable>
              </View>
            </View>

            <View style={styles.spacer} />
          </ScrollView>

          {/* Footer Button */}
          <View style={styles.footer}>
            <Pressable
              style={[styles.addButton, !spiceLevel && styles.addButtonDisabled]}
              onPress={handleAdd}
              disabled={!spiceLevel}
            >
              <Text style={styles.addButtonText}>Add to Order</Text>
              <View style={styles.priceTag}>
                <Text style={styles.priceTagText}>{formatCurrency(total)}</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  overlayTouchable: {
    flex: 1
  },
  modalContainer: {
    backgroundColor: '#f8f7f5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10
  },
  dragHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4
  },
  dragBar: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1'
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 100
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 16,
    paddingBottom: 8
  },
  headerInfo: {
    flex: 1
  },
  itemName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    lineHeight: 28,
    letterSpacing: -0.5
  },
  itemDescription: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500'
  },
  itemPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ff6a00',
    marginLeft: 16
  },
  section: {
    marginTop: 32
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A'
  },
  requiredBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  requiredText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400E',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  optionalText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFF'
  },
  chipActive: {
    backgroundColor: '#ff6a00',
    borderColor: '#ff6a00',
    borderWidth: 2
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569'
  },
  chipTextActive: {
    color: '#FFF',
    fontWeight: '700'
  },
  textInputContainer: {
    marginTop: 12
  },
  textInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    paddingLeft: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 96,
    textAlignVertical: 'top'
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginTop: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  quantityLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A'
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  quantityButtonPlus: {
    backgroundColor: '#ff6a00',
    shadowColor: '#ff6a00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  quantityNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 24,
    textAlign: 'center'
  },
  spacer: {
    height: 20
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f8f7f5',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 16,
    paddingBottom: 32
  },
  addButton: {
    backgroundColor: '#ff6a00',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#ff6a00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  addButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF'
  },
  priceTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  priceTagText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF'
  }
});
