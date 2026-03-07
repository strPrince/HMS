/**
 * API Configuration
 * Central configuration for API endpoints and settings
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

declare const process: {
  env: Record<string, string | undefined>;
};

const ENV_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const ENV_SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

const getLanHostFromExpo = (): string | null => {
  const hostUri =
    (Constants as any)?.expoConfig?.hostUri ||
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any)?.manifest?.debuggerHost;

  if (!hostUri || typeof hostUri !== 'string') return null;
  return hostUri.split(':')[0] || null;
};

const getDevApiBaseUrl = () => {
  if (ENV_API_BASE_URL) return ENV_API_BASE_URL;

  // Browser should use localhost
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api/v1';
  }

  // Physical device should use LAN host from Expo
  const lanHost = getLanHostFromExpo();
  if (lanHost) {
    return `http://${lanHost}:5000/api/v1`;
  }

  // Android emulator localhost bridge
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api/v1';
  }

  return 'http://localhost:5000/api/v1';
};

const getDevSocketUrl = () => {
  if (ENV_SOCKET_URL) return ENV_SOCKET_URL;

  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
  }

  const lanHost = getLanHostFromExpo();
  if (lanHost) {
    return `http://${lanHost}:5000`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }

  return 'http://localhost:5000';
};

// API Base URL - deployment-ready via env vars
export const API_BASE_URL =
  __DEV__ ? getDevApiBaseUrl() : (ENV_API_BASE_URL || 'https://api.your-restaurant.com/api/v1');

// Socket.io URL
export const SOCKET_URL = __DEV__
  ? getDevSocketUrl()
  : (ENV_SOCKET_URL || 'https://api.your-restaurant.com');

// API Timeout
export const API_TIMEOUT = 30000; // 30 seconds

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/staff/login',
    REGISTER_PUSH_TOKEN: '/auth/staff/register-push-token',
    LOGOUT: '/auth/staff/logout',
  },

  // Menu
  MENU: {
    GET_ALL: '/menu/items',
    GET_BY_ID: (id: string) => `/menu/items/${id}`,
  },

  // Tables
  TABLES: {
    GET_ALL: '/tables',
    GET_BY_ID: (id: string) => `/tables/${id}`,
    UPDATE_STATUS: (id: string) => `/tables/${id}/status`,
  },

  // Orders
  ORDERS: {
    GET_ALL: '/orders',
    GET_BY_ID: (id: string) => `/orders/${id}`,
    CREATE: '/orders',
    UPDATE: (id: string) => `/orders/${id}`,
    KITCHEN_QUEUE: '/orders/kitchen',
  },

  // Bills
  BILLS: {
    GET_ALL: '/bills',
    GET_BY_ID: (id: string) => `/bills/${id}`,
    GET_BY_ORDER: (orderId: string) => `/bills/order/${orderId}`,
    GENERATE: (orderId: string) => `/bills/order/${orderId}/generate`,
    RECORD_PAYMENT: (id: string) => `/bills/${id}/payment`,
  },
};
