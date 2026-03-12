import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import AuthService, { LoginResponse } from '../src/services/auth.service';
import SocketService from '../src/services/socket.service';
import NotificationService from '../src/services/notification.service';
import { useRestaurantStore } from '../store/useRestaurantStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { authEvents, storage } from '../src/services/api';
import { API_BASE_URL } from '../src/config/api.config';

type User = {
  id: string;
  name: string;
  phone: string;
  role: 'waiter' | 'cook';
  manager_id?: string;
  restaurantId?: string;
};

const normalizeRole = (value: unknown): User['role'] => {
  const role = String(value || '').trim().toLowerCase();
  if (role === 'cook') return 'cook';
  return 'waiter';
};

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  signIn: (phone: string, pin: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** True when running in Node (SSR) rather than in a browser / native app */
const isSSR = typeof window === 'undefined';

/** Ensure id and restaurantId are always strings */
const normalizeUser = (u: any): User | null => {
  if (!u) return null;
  return {
    ...u,
    id: String(u.id),
    role: normalizeRole(u.role),
    restaurantId: u.restaurantId ? String(u.restaurantId) : undefined,
  };
};

/** Normalize order IDs to the app shape used in routes/store (e.g. "o42") */
const normalizeOrderId = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (raw.startsWith('o')) return raw;
  return /^\d+$/.test(raw) ? `o${raw}` : raw;
};

const getTableLabelFromPayload = (payload: any): string | undefined => {
  const direct = payload?.tableLabel ?? payload?.table?.tableNumber ?? payload?.table?.label;
  if (direct !== undefined && direct !== null && String(direct).trim()) {
    return String(direct).trim();
  }

  const rawTableId = payload?.tableId ?? payload?.table?.id ?? payload?.table_id;
  const raw = String(rawTableId ?? '').trim();
  if (!raw) return undefined;

  const numeric = raw.replace(/^t/, '');
  const withPrefix = raw.startsWith('t') ? raw : `t${numeric}`;
  const table = useRestaurantStore
    .getState()
    .tables.find((entry) => entry.id === raw || entry.id === withPrefix);

  return table?.label || (numeric || undefined);
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Start false on SSR so the server never renders the loading spinner;
  // on the client we start true and flip to false once checkAuth finishes.
  const [isLoading, setIsLoading] = useState(!isSSR);
  const loadInitialData = useRestaurantStore((state) => state.loadInitialData);
  const refreshOrdersFromApi = useRestaurantStore((state) => state.refreshOrdersFromApi);
  const refreshTablesFromApi = useRestaurantStore((state) => state.refreshTablesFromApi);
  const refreshMenuFromApi = useRestaurantStore((state) => state.refreshMenuFromApi);
  const orders = useRestaurantStore((state) => state.orders);
  const tables = useRestaurantStore((state) => state.tables);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const loadNotifications = useNotificationStore((state) => state.loadNotifications);
  const clearNotifications = useNotificationStore((state) => state.clearAll);
  const removeNotificationByOrder = useNotificationStore((state) => state.removeByOrder);
  const didCheck = useRef(false);
  const didInitializeOrderSnapshot = useRef(false);
  const previousOrderStatusById = useRef<Record<string, string>>({});
  const previousOrderIds = useRef<Set<string>>(new Set());

  // ── Check if user is authenticated on mount ───────────────────────
  useEffect(() => {
    if (didCheck.current) return;   // prevent double-fire in StrictMode
    didCheck.current = true;

    let cancelled = false;

    // Safety timeout: if checkAuth hasn't resolved in 4 s, unblock the UI.
    const timeout = setTimeout(() => {
      if (!cancelled) {
        console.warn('[AuthProvider] checkAuth timed out – unblocking UI');
        setIsLoading(false);
      }
    }, 4000);

    (async () => {
      let currentUser: any = null;
      try {
        const token = await storage.getToken();
        currentUser = await AuthService.getCurrentUser();

        // Require both token and user object for a valid local session.
        if (!token && currentUser) {
          await storage.clearAll();
          currentUser = null;
        }

        if (!cancelled && currentUser && token) {
          setUser(normalizeUser(currentUser));
        }
      } catch (err) {
        console.warn('[AuthProvider] checkAuth error:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
        clearTimeout(timeout);
      }

      // Load data & connect socket in the background (non-blocking)
      if (currentUser && !cancelled) {
        // Quick health check before attempting full data load.
        // 1.5s timeout — short enough that tunnel/unreachable backend doesn't stall startup.
        // Note: AbortSignal.timeout() is not supported in Hermes — use AbortController manually.
        const healthController = new AbortController();
        const healthTimeout = setTimeout(() => healthController.abort(), 1500);
        const healthCheck = fetch(`${API_BASE_URL.replace('/api/v1', '')}/health`, {
          method: 'GET',
          signal: healthController.signal,
        })
          .then(res => res.ok)
          .catch(() => false)
          .finally(() => clearTimeout(healthTimeout));

        const isHealthy = await healthCheck;
        if (!isHealthy) {
          console.warn('[AuthProvider] Backend health check failed - proceeding with cached data. If using tunnel, set EXPO_PUBLIC_API_BASE_URL in .env');
        }

        // Timeout wrapper: don't let data loading block UI forever
        Promise.race([
          loadInitialData(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Initial data load timeout')), 8000))
        ]).catch((err) => {
          console.warn('[AuthProvider] Initial data load failed/timeout:', err.message);
          // Proceed with cached data from AsyncStorage
        });
        loadNotifications().catch(console.warn);
        SocketService.connect(String(currentUser.id), currentUser.role);
        NotificationService.registerForPushNotifications();
      }
    })();

    return () => { cancelled = true; clearTimeout(timeout); };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Listen for forced logout (401 from API interceptor) ───────────
  useEffect(() => {
    const handler = () => {
      setUser(null);
      SocketService.disconnect();
      clearNotifications();
      router.replace('/phone-login');
    };
    authEvents.on('logout', handler);
    return () => { authEvents.off('logout', handler); };
  }, [clearNotifications]);

  // Live sync for socket events + fallback polling
  useEffect(() => {
    if (!user) return;

    const syncOrdersAndTables = () => {
      refreshOrdersFromApi().catch(console.warn);
      refreshTablesFromApi().catch(console.warn);
    };

    const syncMenu = () => {
      refreshMenuFromApi().catch(console.warn);
    };

    const handleOrderCreated = (data: any) => {
      if (user.role === 'cook') {
        const orderId = normalizeOrderId(data?.id ?? data?.orderId ?? data?.order?.id);
        if (orderId) {
          const added = addNotification({
            type: 'order_placed',
            title: 'New Order Placed',
            message: 'A new order has been placed and needs preparation',
            orderId,
            tableLabel: getTableLabelFromPayload(data),
          });
          if (added) {
            NotificationService.playInAppAlert('New Order Placed', 'A new order has been placed and needs preparation');
          }
        }
      }
      syncOrdersAndTables();
    };

    const handleOrderUpdated = (data: any) => {
      const status = String(data?.status || '').toLowerCase();
      const orderId = normalizeOrderId(data?.id ?? data?.orderId ?? data?.order?.id);

      if (orderId && ['served', 'completed', 'cancelled'].includes(status)) {
        removeNotificationByOrder(orderId, ['order_ready']);
      }

      if (orderId && ['ready', 'served', 'billing', 'completed', 'cancelled'].includes(status)) {
        removeNotificationByOrder(orderId, ['order_placed']);
      }

      if (user.role === 'waiter' && status === 'ready') {
        if (orderId) {
          const added = addNotification({
            type: 'order_ready',
            title: 'Order Ready',
            message: 'Order is ready to serve',
            orderId,
            tableLabel: getTableLabelFromPayload(data),
          });
          if (added) {
            NotificationService.playInAppAlert('Order Ready', 'An order is ready to serve');
          }
        }
      }

      syncOrdersAndTables();
    };

    const offOrderCreated = SocketService.onOrderCreated(handleOrderCreated);
    const offOrderUpdated = SocketService.onOrderUpdated(handleOrderUpdated);
    const offTableUpdated = SocketService.onTableUpdated(syncOrdersAndTables);

    syncOrdersAndTables();
    syncMenu();

    const orderTablePoller = setInterval(syncOrdersAndTables, 10000);
    const menuPoller = setInterval(syncMenu, 60000);

    return () => {
      clearInterval(orderTablePoller);
      clearInterval(menuPoller);
      offOrderCreated?.();
      offOrderUpdated?.();
      offTableUpdated?.();
    };
  }, [user, refreshOrdersFromApi, refreshTablesFromApi, refreshMenuFromApi, addNotification, removeNotificationByOrder]);

  // Fallback: derive notifications from order status transitions.
  // This covers missed socket events and keeps waiter notifications reliable.
  useEffect(() => {
    if (!user) return;

    if (!didInitializeOrderSnapshot.current) {
      const initialSnapshot: Record<string, string> = {};
      const initialIds = new Set<string>();
      for (const order of orders) {
        initialSnapshot[order.id] = order.status;
        initialIds.add(order.id);
      }
      previousOrderStatusById.current = initialSnapshot;
      previousOrderIds.current = initialIds;
      didInitializeOrderSnapshot.current = true;
      return;
    }

    const previous = previousOrderStatusById.current;
    const current: Record<string, string> = {};
    const currentIds = new Set<string>();
    for (const order of orders) {
      current[order.id] = order.status;
      currentIds.add(order.id);
    }

    for (const order of orders) {
      const previousStatus = previous[order.id];
      const isNewOrder = !previousOrderIds.current.has(order.id);
      const tableLabel = tables.find((table) => table.id === order.tableId)?.label || order.tableId.replace(/^t/, '');

      // Cook fallback: new order appeared via polling (socket missed)
      if (user.role === 'cook' && isNewOrder) {
        const activeStatuses = ['pending', 'confirmed', 'preparing'];
        if (activeStatuses.includes(order.status)) {
          const added = addNotification({
            type: 'order_placed',
            title: 'New Order',
            message: `New order for ${tableLabel ? `Table ${tableLabel}` : 'Parcel'}`,
            orderId: order.id,
            tableLabel,
          });
          if (added) {
            NotificationService.playInAppAlert('New Order', `New order for ${tableLabel ? `Table ${tableLabel}` : 'Parcel'}`);
          }
        }
      }

      if (user.role === 'waiter') {
        // Only alert when a known order transitions to ready.
        // This avoids spurious alerts for old ready orders loaded on startup.
        const becameReady = previousStatus && order.status === 'ready' && previousStatus !== 'ready';
        if (becameReady) {
          const added = addNotification({
            type: 'order_ready',
            title: 'Order Ready',
            message: 'Order is ready to serve',
            orderId: order.id,
            tableLabel,
          });
          if (added) {
            NotificationService.playInAppAlert('Order Ready', 'An order is ready to serve');
          }
        }
      }

      if (order.status === 'served' || order.status === 'completed' || order.status === 'cancelled') {
        removeNotificationByOrder(order.id, ['order_ready']);
      }

      if (
        order.status === 'ready' ||
        order.status === 'served' ||
        order.status === 'billing' ||
        order.status === 'completed' ||
        order.status === 'cancelled'
      ) {
        removeNotificationByOrder(order.id, ['order_placed']);
      }
    }

    previousOrderStatusById.current = current;
    previousOrderIds.current = currentIds;
  }, [user, orders, tables, addNotification, removeNotificationByOrder]);

  useEffect(() => {
    didInitializeOrderSnapshot.current = false;
    previousOrderStatusById.current = {};
    previousOrderIds.current = new Set();
  }, [user?.id, user?.role]);

  // ── signIn ────────────────────────────────────────────────────────
  const signIn = useCallback(async (phone: string, pin: string): Promise<boolean> => {
    try {
      const response: LoginResponse = await AuthService.login(phone, pin);

      if (response.success && response.user) {
        const normalized = normalizeUser(response.user)!;
        setUser(normalized);

        // Load data in background
        loadInitialData().catch(console.warn);
        loadNotifications().catch(console.warn);
        SocketService.connect(normalized.id, normalized.role);
        NotificationService.registerForPushNotifications();

        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Sign in failed:', error);
      throw error;
    }
  }, [loadInitialData, loadNotifications]);

  // ── signOut ───────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      // API call failed (network error, 401, 404, etc.) — local cleanup still runs
      console.warn('[AuthProvider] Logout API call failed (local session cleared):', error);
    } finally {
      // Always clear local session regardless of API result
      SocketService.disconnect();
      clearNotifications();
      setUser(null);
      router.replace('/phone-login');
    }
  }, [clearNotifications]);

  // ── Context value ─────────────────────────────────────────────────
  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    signIn,
    signOut,
  }), [user, isLoading, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
