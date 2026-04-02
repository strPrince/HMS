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

  const host = hostUri.split(':')[0] || null;
  if (!host) return null;

  // Reject tunnel/cloud hostnames (exp.direct, ngrok, etc.) – only accept
  // plain IPv4 addresses so we never accidentally point the API at a tunnel URL.
  const isIpAddress = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  if (!isIpAddress) {
    // Running in tunnel mode — LAN IP cannot be auto-detected.
    // Set EXPO_PUBLIC_API_BASE_URL and EXPO_PUBLIC_SOCKET_URL in your .env file.
    // Example: EXPO_PUBLIC_API_BASE_URL=http://192.168.1.x:5000/api/v1
    console.warn(
      '[API Config] Tunnel mode detected. Cannot auto-detect backend IP.\n' +
      'Create a .env file in HMS-app/ with:\n' +
      '  EXPO_PUBLIC_API_BASE_URL=http://<YOUR_PC_LAN_IP>:5000/api/v1\n' +
      '  EXPO_PUBLIC_SOCKET_URL=http://<YOUR_PC_LAN_IP>:5000'
    );
    return null;
  }

  return host;
};

const getDevApiBaseUrl = () => {
  if (ENV_API_BASE_URL) {
    console.log('[API Config] Using EXPO_PUBLIC_API_BASE_URL:', ENV_API_BASE_URL);
    return ENV_API_BASE_URL;
  }

  // Browser should use localhost
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api/v1';
  }

  // Physical device should use LAN host from Expo
  const lanHost = getLanHostFromExpo();
  if (lanHost) {
    console.log('[API Config] Auto-detected LAN host:', lanHost);
    return `http://${lanHost}:5000/api/v1`;
  }

  // Android emulator localhost bridge
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api/v1';
  }

  console.warn('[API Config] Could not detect LAN IP. Falling back to localhost — this will fail on physical devices.');
  return 'http://localhost:5000/api/v1';
};

const getDevSocketUrl = () => {
  if (ENV_SOCKET_URL) {
    console.log('[Socket Config] Using EXPO_PUBLIC_SOCKET_URL:', ENV_SOCKET_URL);
    return ENV_SOCKET_URL;
  }

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

  console.warn('[Socket Config] Could not detect LAN IP. Falling back to localhost.');
  return 'http://localhost:5000';
};

// API Base URL - deployment-ready via env vars
export const API_BASE_URL =
  __DEV__ ? getDevApiBaseUrl() : (ENV_API_BASE_URL || 'https://api.your-restaurant.com/api/v1');

// Socket.io URL
export const SOCKET_URL = __DEV__
  ? getDevSocketUrl()
  : (ENV_SOCKET_URL || 'https://api.your-restaurant.com');

// Startup diagnostic — shows in Metro/Expo console
console.log(`[HMS] API_BASE_URL = ${API_BASE_URL}`);
console.log(`[HMS] SOCKET_URL  = ${SOCKET_URL}`);

// API Timeout
export const API_TIMEOUT = 10000; // 10 seconds - faster failure detection

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/staff/login',
    REGISTER_PUSH_TOKEN: '/auth/staff/register-push-token',
    LOGOUT: '/auth/logout',
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
