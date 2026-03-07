import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import AuthService, { LoginResponse } from '../src/services/auth.service';
import SocketService from '../src/services/socket.service';
import NotificationService from '../src/services/notification.service';
import { useRestaurantStore } from '../store/useRestaurantStore';
import { authEvents } from '../src/services/api';

type User = {
  id: string;
  name: string;
  phone: string;
  role: 'waiter' | 'cook' | 'manager';
  manager_id?: string;
  restaurantId?: string;
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
    restaurantId: u.restaurantId ? String(u.restaurantId) : undefined,
  };
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
  const didCheck = useRef(false);

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
        currentUser = await AuthService.getCurrentUser();
        if (!cancelled && currentUser) {
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
        loadInitialData().catch(console.warn);
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
      router.replace('/phone-login');
    };
    authEvents.on('logout', handler);
    return () => { authEvents.off('logout', handler); };
  }, []);

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

    SocketService.onOrderCreated(syncOrdersAndTables);
    SocketService.onOrderReady(syncOrdersAndTables);
    SocketService.onOrderCompleted(syncOrdersAndTables);
    SocketService.onOrderUpdated(syncOrdersAndTables);
    SocketService.onTableUpdated(syncOrdersAndTables);

    syncOrdersAndTables();
    syncMenu();

    const orderTablePoller = setInterval(syncOrdersAndTables, 10000);
    const menuPoller = setInterval(syncMenu, 60000);

    return () => {
      clearInterval(orderTablePoller);
      clearInterval(menuPoller);
      SocketService.off('order:created', syncOrdersAndTables);
      SocketService.off('order:ready', syncOrdersAndTables);
      SocketService.off('order:completed', syncOrdersAndTables);
      SocketService.off('order:updated', syncOrdersAndTables);
      SocketService.off('table:updated', syncOrdersAndTables);
    };
  }, [user, refreshOrdersFromApi, refreshTablesFromApi, refreshMenuFromApi]);

  // ── signIn ────────────────────────────────────────────────────────
  const signIn = useCallback(async (phone: string, pin: string): Promise<boolean> => {
    try {
      const response: LoginResponse = await AuthService.login(phone, pin);

      if (response.success && response.user) {
        const normalized = normalizeUser(response.user)!;
        setUser(normalized);

        // Load data in background
        loadInitialData().catch(console.warn);
        SocketService.connect(normalized.id, normalized.role);
        NotificationService.registerForPushNotifications();

        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Sign in failed:', error);
      throw error;
    }
  }, [loadInitialData]);

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
      setUser(null);
      router.replace('/phone-login');
    }
  }, []);

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
