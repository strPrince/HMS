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
  USER: '@hms_user_data',
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
      // Don't re-emit logout if the call that failed was the logout endpoint itself
      const requestUrl = error.config?.url || '';
      const isLogoutCall = requestUrl.includes('/auth/staff/logout');
      if (!isLogoutCall) {
        // Token expired or invalid - clear storage and notify AuthProvider
        await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
        authEvents.emit('logout');
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
  
  getToken: async () => {
    return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  },
  
  saveUser: async (user: any) => {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },
  
  getUser: async () => {
    const user = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  },
  
  clearAll: async () => {
    await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
  },
};

export default apiClient;
