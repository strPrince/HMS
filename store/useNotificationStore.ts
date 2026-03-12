import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotificationType = 'order_placed' | 'order_ready' | 'order_served' | 'billing_request';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  orderId: string;
  tableLabel?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationStore {
  notifications: Notification[];
  isLoading: boolean;
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => boolean;
  markAsRead: (notificationId: string) => void;
  removeNotification: (notificationId: string) => void;
  clearAll: () => void;
  removeByOrder: (orderId: string, types?: NotificationType[]) => void;
  getUnreadCount: () => number;
  loadNotifications: () => Promise<void>;
  persistNotifications: () => Promise<void>;
}

const STORAGE_KEY = '@hms_notifications';
const MAX_NOTIFICATIONS = 100;
const DUPLICATE_WINDOW_MS = 3000;

const normalizeOrderId = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (raw.startsWith('o')) return raw;
  return /^\d+$/.test(raw) ? `o${raw}` : raw;
};

const sanitizeNotification = (value: any): Notification | null => {
  if (!value || typeof value !== 'object') return null;
  const orderId = normalizeOrderId(value.orderId);
  if (!orderId) return null;

  const type = String(value.type || '') as NotificationType;
  const allowedTypes: NotificationType[] = ['order_placed', 'order_ready', 'order_served', 'billing_request'];
  if (!allowedTypes.includes(type)) return null;

  const id = String(value.id || '').trim();
  const title = String(value.title || '').trim();
  const message = String(value.message || '').trim();
  const createdAt = value.createdAt ? new Date(value.createdAt).toISOString() : new Date().toISOString();

  if (!id || !title || !message) return null;

  return {
    id,
    type,
    title,
    message,
    orderId,
    tableLabel: value.tableLabel ? String(value.tableLabel) : undefined,
    isRead: Boolean(value.isRead),
    createdAt,
  };
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  isLoading: false,

  addNotification: (input) => {
    const now = Date.now();
    const orderId = normalizeOrderId(input.orderId);
    if (!orderId) return false;

    const data = { ...input, orderId };
    const hasDuplicate = get().notifications.some((existing) => {
      if (existing.type !== data.type || existing.orderId !== data.orderId) return false;
      const ageMs = now - new Date(existing.createdAt).getTime();
      return ageMs >= 0 && ageMs < DUPLICATE_WINDOW_MS;
    });
    if (hasDuplicate) return false;

    const notification: Notification = {
      ...data,
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    set((state) => {
      const updated = [notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
      return { notifications: updated };
    });

    // Persist in background
    get().persistNotifications();
    return true;
  },

  markAsRead: (notificationId) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      ),
    }));

    get().persistNotifications();
  },

  removeNotification: (notificationId) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== notificationId),
    }));

    get().persistNotifications();
  },

  clearAll: () => {
    set({ notifications: [] });

    get().persistNotifications();
  },

  removeByOrder: (rawOrderId, types) => {
    const orderId = normalizeOrderId(rawOrderId);
    if (!orderId) return;

    set((state) => ({
      notifications: state.notifications.filter((entry) => {
        if (entry.orderId !== orderId) return true;
        if (!types || types.length === 0) return false;
        return !types.includes(entry.type);
      }),
    }));

    get().persistNotifications();
  },

  getUnreadCount: () => {
    return get().notifications.filter((n) => !n.isRead).length;
  },

  loadNotifications: async () => {
    set({ isLoading: true });
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const fromStorage = Array.isArray(parsed)
          ? parsed
              .map(sanitizeNotification)
              .filter((entry): entry is Notification => Boolean(entry))
          : [];
        const inMemory = get().notifications;

        const merged = [...inMemory, ...fromStorage]
          .map(sanitizeNotification)
          .filter((entry): entry is Notification => Boolean(entry))
          .reduce<Notification[]>((acc, item) => {
            if (acc.some((existing) => existing.id === item.id)) return acc;
            acc.push(item as Notification);
            return acc;
          }, [])
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, MAX_NOTIFICATIONS);

        set({ notifications: merged });
      }
    } catch (error) {
      console.warn('Failed to load notifications:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  persistNotifications: async () => {
    try {
      const { notifications } = get();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.warn('Failed to persist notifications:', error);
    }
  },
}));
