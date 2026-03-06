/**
 * Optimized AuthProvider - Production Ready
 * With proper memoization and performance optimizations
 */

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, useSegments } from 'expo-router';
import AuthService, { LoginResponse } from '../src/services/auth.service';
import SocketService from '../src/services/socket.service';
import NotificationService from '../src/services/notification.service';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Handle navigation based on auth state (optimized)
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'phone-login' || segments[0] === 'pin';
    
    if (!user && !inAuthGroup) {
      router.replace('/phone-login');
    } else if (user && inAuthGroup) {
      // Navigate based on role
      const destination = user.role === 'waiter' ? '/(tabs)/tables' : '/(tabs)/kitchen';
      router.replace(destination);
    }
  }, [user, segments, isLoading, router]);

  const checkAuth = useCallback(async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        
        // Initialize services
        SocketService.connect(currentUser.id, currentUser.role);
        NotificationService.registerForPushNotifications();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signIn = useCallback(async (phone: string, pin: string): Promise<boolean> => {
    try {
      const response: LoginResponse = await AuthService.login(phone, pin);
      
      if (response.success && response.user) {
        setUser(response.user);
        
        // Initialize services
        if (response.user.role === 'waiter' || response.user.role === 'cook') {
          SocketService.connect(response.user.id, response.user.role);
        }
        NotificationService.registerForPushNotifications();
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await AuthService.logout();
      SocketService.disconnect();
      setUser(null);
      router.replace('/phone-login');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }, [router]);

  // Memoize context value
  const value = useMemo(
    () => ({
      user,
      isLoading,
      signIn,
      signOut,
    }),
    [user, isLoading, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
