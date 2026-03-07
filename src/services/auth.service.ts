/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

import apiClient, { storage } from './api';
import { API_ENDPOINTS } from '../config/api.config';

export interface LoginRequest {
  phone: string;
  pin: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    name: string;
    phone: string;
    role: 'waiter' | 'cook' | 'manager';
    manager_id?: string;
    restaurantId?: string;
  };
}

interface StaffLoginApiResponse {
  success: boolean;
  message?: string;
  data?: {
    user?: {
      id: string;
      name: string;
      phone: string;
      role: 'waiter' | 'cook' | 'manager';
      restaurantId?: string;
    };
    tokens?: {
      accessToken?: string;
      refreshToken?: string;
      expiresIn?: number;
    };
  };
  token?: string;
  user?: {
    id: string;
    name: string;
    phone: string;
    role: 'waiter' | 'cook' | 'manager';
    manager_id?: string;
    restaurantId?: string;
  };
}

export interface RegisterPushTokenRequest {
  expo_push_token: string;
}

class AuthService {
  /**
   * Login with phone and PIN
   */
  async login(phone: string, pin: string): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<StaffLoginApiResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        { phone, pin }
      );

      const payload = response.data;
      const token = payload?.data?.tokens?.accessToken || payload?.token;
      const user = payload?.data?.user || payload?.user;

      if (payload?.success && token && user) {
        // Normalize IDs to strings (backend returns numbers)
        const normalizedUser = {
          ...user,
          id: String(user.id),
          restaurantId: user.restaurantId ? String(user.restaurantId) : undefined,
        };

        // Save token and user data
        await storage.saveToken(token);
        await storage.saveUser(normalizedUser);

        return {
          success: true,
          token,
          user: normalizedUser,
        };
      }

      throw new Error('Login failed');
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Invalid credentials';
      throw new Error(message);
    }
  }

  /**
   * Register device push token for notifications
   */
  async registerPushToken(expoPushToken: string): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.REGISTER_PUSH_TOKEN, {
        expo_push_token: expoPushToken,
      });
    } catch (error) {
      console.error('Failed to register push token:', error);
      // Don't throw - notification registration shouldn't block app usage
    }
  }

  /**
   * Logout - Clear local storage and notify backend
   */
  async logout(): Promise<void> {
    let lastError: any = null;
    try {
      const endpoints = Array.from(
        new Set([API_ENDPOINTS.AUTH.LOGOUT, '/auth/staff/logout', '/auth/logout'])
      );

      for (const endpoint of endpoints) {
        try {
          await apiClient.post(endpoint);
          lastError = null;
          break;
        } catch (error: any) {
          lastError = error;
          const status = error?.response?.status;
          // Route may differ across backend versions; try next known endpoint on 404.
          if (status === 404) continue;
          // For other failures, stop retrying and proceed to local cleanup.
          break;
        }
      }

      if (lastError) {
        const status = lastError?.response?.status;
        if (status && status !== 404) {
          console.warn(`Logout API call failed (${status}). Clearing local session.`);
        }
      }
    } finally {
      // Always clear local storage
      await storage.clearAll();
    }
  }

  /**
   * Get current user from storage
   */
  async getCurrentUser() {
    return await storage.getUser();
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await storage.getToken();
    return !!token;
  }
}

export default new AuthService();
