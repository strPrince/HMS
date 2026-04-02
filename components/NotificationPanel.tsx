import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, X } from 'lucide-react-native';
import { useAuth } from '../providers/AuthProvider';
import { useNotificationStore, type Notification, type NotificationType } from '../store/useNotificationStore';

type NotificationPanelProps = {
  visible: boolean;
  onClose: () => void;
};

const normalizeOrderId = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (raw.startsWith('o')) return raw;
  return /^\d+$/.test(raw) ? `o${raw}` : raw;
};

const formatTimeAgo = (value: string): string => {
  const createdAt = new Date(value).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - createdAt);
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const getTypeBadge = (type: NotificationType): string => {
  if (type === 'order_ready') return 'READY';
  if (type === 'order_served') return 'SERVED';
  if (type === 'billing_request') return 'BILL';
  return 'NEW';
};

const normalizeRole = (value: unknown): 'waiter' | 'cook' | undefined => {
  const role = String(value || '').trim().toLowerCase();
  if (role === 'waiter' || role === 'cook') return role;
  return undefined;
};

const isVisibleForRole = (role: 'waiter' | 'cook' | undefined, notification: Notification) => {
  if (role === 'cook') return notification.type === 'order_placed';
  if (role === 'waiter') return notification.type === 'order_ready' || notification.type === 'order_served';
  return true;
};

export function NotificationPanel({ visible, onClose }: NotificationPanelProps) {
  const router = useRouter();
  const { user } = useAuth();

  const notifications = useNotificationStore((state) => state.notifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const clearAll = useNotificationStore((state) => state.clearAll);

  const normalizedRole = normalizeRole(user?.role);

  const filteredNotifications = useMemo(
    () => notifications.filter((notification) => isVisibleForRole(normalizedRole, notification)),
    [notifications, normalizedRole]
  );

  const handleOpenNotification = (notification: Notification) => {
    markAsRead(notification.id);
    onClose();

    const orderId = normalizeOrderId(notification.orderId);
    if (!orderId) return;

    const route = normalizedRole === 'cook' ? `/kitchen/order/${orderId}` : `/order/${orderId}`;
    router.push(route as any);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <Bell size={18} color="#1F2937" />
              <Text style={styles.title}>Notifications</Text>
            </View>
            {filteredNotifications.length > 0 ? (
              <Pressable onPress={clearAll} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>Clear All</Text>
              </Pressable>
            ) : null}
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {filteredNotifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Bell size={28} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No notifications yet</Text>
                <Text style={styles.emptyText}>New kitchen and order updates will appear here.</Text>
              </View>
            ) : (
              filteredNotifications.map((notification) => (
                <Pressable
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    notification.isRead ? styles.notificationCardRead : styles.notificationCardUnread,
                  ]}
                  onPress={() => handleOpenNotification(notification)}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardTitleWrap}>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>{getTypeBadge(notification.type)}</Text>
                      </View>
                      <Text style={styles.cardTitle}>{notification.title}</Text>
                    </View>
                    <Pressable
                      onPress={(event) => {
                        event.stopPropagation();
                        removeNotification(notification.id);
                      }}
                      style={styles.removeButton}
                    >
                      <X size={16} color="#64748B" />
                    </Pressable>
                  </View>

                  <Text style={styles.cardMessage}>{notification.message}</Text>

                  <View style={styles.cardBottomRow}>
                    <Text style={styles.cardMeta}>
                      {notification.tableLabel ? `Table ${notification.tableLabel}` : `Order ${notification.orderId}`}
                    </Text>
                    <Text style={styles.cardMeta}>{formatTimeAgo(notification.createdAt)}</Text>
                  </View>

                  {!notification.isRead ? <View style={styles.unreadDot} /> : null}
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '78%',
    minHeight: '45%',
    paddingBottom: 16,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  clearButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  notificationCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    position: 'relative',
  },
  notificationCardUnread: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  notificationCardRead: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  typeBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: 10,
    color: '#1E40AF',
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMessage: {
    marginTop: 6,
    fontSize: 13,
    color: '#334155',
  },
  cardBottomRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMeta: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  unreadDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
});
