import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import { colors } from '../constants/colors';
import { useRestaurantStore } from '../store/useRestaurantStore';
import { formatCurrency, formatDate, getOrderStatusText } from '../utils/helpers';
import { ArrowLeft, Printer, Share2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function GenerateBill() {
  const { orders, getOrderItems, getOrderTotal } = useRestaurantStore();
  const router = useRouter();

  // For demo, show the latest closed order
  const latestOrder = [...orders]
    .filter(order => order.status === 'closed')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (!latestOrder) {
    return (
      <View style={styles.container}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.noBills}>No closed orders to generate bill</Text>
      </View>
    );
  }

  const orderItems = getOrderItems(latestOrder.id);
  const total = getOrderTotal(latestOrder.id);
  const tax = total * 0.1; // 10% tax
  const grandTotal = total + tax;

  const handlePrint = () => {
    console.log('Printing bill for order:', latestOrder.id);
  };

  const handleShare = () => {
    console.log('Sharing bill for order:', latestOrder.id);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Generated Bill</Text>
        </View>

        {/* Bill Header */}
        <View style={styles.billHeader}>
          <Text style={styles.restaurantName}>Delicious Bites</Text>
          <Text style={styles.restaurantAddress}>123 Food Street, City</Text>
          <Text style={styles.restaurantPhone}>+1 234 567 8900</Text>
          <View style={styles.billInfo}>
            <Text style={styles.billNumber}>Bill # {latestOrder.id}</Text>
            <Text style={styles.billDate}>{formatDate(latestOrder.createdAt)}</Text>
          </View>
        </View>

        {/* Order Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>Table: {latestOrder.tableId}</Text>
          <Text style={styles.infoText}>Status: {getOrderStatusText(latestOrder.status)}</Text>
        </View>

        {/* Bill Items */}
        <View style={styles.itemsSection}>
          <View style={styles.itemsHeader}>
            <Text style={styles.itemsHeaderText}>Item</Text>
            <Text style={styles.itemsHeaderText}>Qty</Text>
            <Text style={styles.itemsHeaderText}>Price</Text>
            <Text style={styles.itemsHeaderText}>Total</Text>
          </View>
          
          {orderItems.map(({ item, quantity }) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQuantity}>{quantity}</Text>
              <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
              <Text style={styles.itemTotal}>{formatCurrency(item.price * quantity)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax (10%)</Text>
            <Text style={styles.totalValue}>{formatCurrency(tax)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabelBold}>Grand Total</Text>
            <Text style={styles.totalValueBold}>{formatCurrency(grandTotal)}</Text>
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Payment Information</Text>
          <Text style={styles.paymentText}>Cash Payment</Text>
          <Text style={styles.paymentText}>Thank you for your visit!</Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Pressable style={styles.printButton} onPress={handlePrint}>
            <Printer size={20} color={colors.surface} />
            <Text style={styles.printButtonText}>Print</Text>
          </Pressable>
          <Pressable style={styles.shareButton} onPress={handleShare}>
            <Share2 size={20} color={colors.surface} />
            <Text style={styles.shareButtonText}>Share</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  noBills: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    padding: 40,
  },
  billHeader: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  restaurantAddress: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 4,
    textAlign: 'center',
  },
  restaurantPhone: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 16,
  },
  billInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  billNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  billDate: {
    fontSize: 14,
    color: colors.muted,
  },
  infoSection: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  itemsSection: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemsHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 8,
    marginBottom: 12,
  },
  itemsHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  itemQuantity: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  itemPrice: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  itemTotal: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  totalsSection: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.text,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  totalLabelBold: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  totalValueBold: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  paymentSection: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  paymentText: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  printButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  printButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.surface,
    marginLeft: 8,
  },
  shareButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.surface,
    marginLeft: 8,
  },
});
