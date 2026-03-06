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
      console.error('Failed to fetch menu items:', error);
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
      console.error('Failed to fetch menu item:', error);
      throw error;
    }
  }
}

export default new MenuService();
