import { Pressable, Text, View } from 'react-native';
import { Send } from 'lucide-react-native';
import { formatCurrency } from '../../utils/helpers';
import { styles } from './orderDetailsStyles';

interface BillSummaryProps {
  displayItems: { item: { id: string; name: string; price: number }; quantity: number }[];
  subtotal: number;
  gst: number;
  grandTotal: number;
  taxLabel: string;
  sendingToManager: boolean;
  onSendToManager: () => void;
  onBackToTables: () => void;
}

export default function BillSummary({
  displayItems,
  subtotal,
  gst,
  grandTotal,
  taxLabel,
  sendingToManager,
  onSendToManager,
  onBackToTables,
}: BillSummaryProps) {
  return (
    <View style={styles.billSummarySection}>
      <View style={styles.billSummaryCard}>
        <Text style={styles.billSummaryTitle}>📋 Bill Summary</Text>
        <Text style={styles.billSummarySubtext}>Review and send to manager for payment</Text>

        <View style={styles.billDivider} />

        {displayItems.map(({ item, quantity }) => (
          <View key={item.id} style={styles.billItemRow}>
            <Text style={styles.billItemName}>{quantity}x {item.name}</Text>
            <Text style={styles.billItemPrice}>{formatCurrency(item.price * quantity)}</Text>
          </View>
        ))}

        <View style={styles.billDivider} />

        <View style={styles.billTotalRow}>
          <Text style={styles.billTotalLabel}>Subtotal</Text>
          <Text style={styles.billTotalValue}>{formatCurrency(subtotal)}</Text>
        </View>
        <View style={styles.billTotalRow}>
          <Text style={styles.billTotalLabel}>{taxLabel}</Text>
          <Text style={styles.billTotalValue}>{formatCurrency(gst)}</Text>
        </View>
        <View style={[styles.billTotalRow, { marginTop: 4 }]}>
          <Text style={styles.billGrandLabel}>Grand Total</Text>
          <Text style={styles.billGrandValue}>{formatCurrency(grandTotal)}</Text>
        </View>
      </View>

      <Pressable
        style={[styles.sendToManagerBtn, sendingToManager && { opacity: 0.6 }]}
        onPress={onSendToManager}
        disabled={sendingToManager}
      >
        <Send size={18} color="#FFF" />
        <Text style={styles.sendToManagerBtnText}>
          {sendingToManager ? 'Sending...' : 'Send to Manager'}
        </Text>
      </Pressable>

      <Pressable style={styles.backToTablesBtn} onPress={onBackToTables}>
        <Text style={styles.backToTablesBtnText}>Back to Tables</Text>
      </Pressable>
    </View>
  );
}
