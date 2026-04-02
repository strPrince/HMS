/**
 * Menu Service
 * Handles all menu-related API calls
 */

import apiClient from './api';
import { API_ENDPOINTS } from '../config/api.config';

class MenuService {
  private extractData(response: any) {
    return response?.data?.data ?? response?.data;
  }

  private getErrorMessage(error: any) {
    return error?.message || error?.response?.data?.message || 'Unknown error';
  }

  private isAuthError(error: any) {
    return error?.response?.status === 401;
  }

  /**
   * Get all menu items with optional category filter
   */
  async getMenuItems(category?: string) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.MENU.GET_ALL, {
        params: category ? { category } : undefined,
      });
      return this.extractData(response);
    } catch (error) {
      if (!this.isAuthError(error)) {
        console.warn(`Failed to fetch menu items: ${this.getErrorMessage(error)}`);
      }
      throw error;
    }
  }

  /**
   * Get menu item by ID
   */
  async getMenuItemById(itemId: string) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.MENU.GET_BY_ID(itemId));
      return this.extractData(response);
    } catch (error) {
      if (!this.isAuthError(error)) {
        console.warn(`Failed to fetch menu item: ${this.getErrorMessage(error)}`);
      }
      throw error;
    }
  }
}

export default new MenuService();
