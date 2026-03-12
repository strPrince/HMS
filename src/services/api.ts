/**
 * API Service
 * Axios instance with interceptors for authentication and error handling
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_TIMEOUT } from '../config/api.config';

/** Simple event emitter for auth events (e.g. forced logout on 401) */
type Listener = () => void;
class AuthEventEmitter {
  private listeners: Record<string, Listener[]> = {};
  on(event: string, fn: Listener) { (this.listeners[event] ??= []).push(fn); }
  off(event: string, fn: Listener) { this.listeners[event] = (this.listeners[event] || []).filter(f => f !== fn); }
  emit(event: string) { (this.listeners[event] || []).forEach(fn => fn()); }
}
export const authEvents = new AuthEventEmitter();

const STORAGE_KEYS = {
  TOKEN: '@hms_auth_token',
  REFRESH_TOKEN: '@hms_refresh_token',
  USER: '@hms_user_data',
};

let isHandlingUnauthorized = false;
let refreshPromise: Promise<string | null> | null = null;

const requestNewAccessToken = async (): Promise<string | null> => {
  const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  if (!refreshToken) return null;

  try {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
    const nextAccessToken =
      response?.data?.data?.tokens?.accessToken ||
      response?.data?.data?.accessToken ||
      response?.data?.accessToken ||
      null;

    const nextRefreshToken =
      response?.data?.data?.tokens?.refreshToken ||
      response?.data?.data?.refreshToken ||
      null;

    if (!nextAccessToken) return null;

    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, nextAccessToken);
    if (nextRefreshToken) {
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, nextRefreshToken);
    }

    return nextAccessToken;
  } catch (_error) {
    return null;
  }
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error retrieving token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
      const requestUrl = error.config?.url || '';
      const isAuthEndpoint =
        requestUrl.includes('/auth/staff/login') ||
        requestUrl.includes('/auth/manager/login') ||
        requestUrl.includes('/auth/refresh') ||
        requestUrl.includes('/auth/refresh-token') ||
        requestUrl.includes('/auth/staff/logout') ||
        requestUrl.includes('/auth/logout');

      if (!isAuthEndpoint && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;

        refreshPromise = refreshPromise || requestNewAccessToken();
        const nextAccessToken = await refreshPromise;
        refreshPromise = null;

        if (nextAccessToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
          return apiClient(originalRequest);
        }
      }

      if (!isAuthEndpoint && !isHandlingUnauthorized) {
        isHandlingUnauthorized = true;
        try {
          // Token expired/invalid: clear local session once and notify app.
          await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.REFRESH_TOKEN, STORAGE_KEYS.USER]);
          authEvents.emit('logout');
        } finally {
          // Prevent 401 storms from triggering repeated logout actions.
          setTimeout(() => {
            isHandlingUnauthorized = false;
          }, 1500);
        }
      }
    }
    return Promise.reject(error);
  }
);

// Helper functions for storage
export const storage = {
  saveToken: async (token: string) => {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
  },

  saveRefreshToken: async (token: string) => {
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  },
  
  getToken: async () => {
    return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  },

  getRefreshToken: async () => {
    return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },
  
  saveUser: async (user: any) => {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },
  
  getUser: async () => {
    const user = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  },
  
  clearAll: async () => {
    await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.REFRESH_TOKEN, STORAGE_KEYS.USER]);
  },
};

export default apiClient;
