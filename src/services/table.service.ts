/**
 * Table Service
 * Handles all table-related API calls
 */

import apiClient from './api';
import { API_ENDPOINTS } from '../config/api.config';

class TableService {
  private extractData(response: any) {
    return response?.data?.data ?? response?.data;
  }

  /**
   * Get all tables
   */
  async getTables() {
    try {
      const response = await apiClient.get(API_ENDPOINTS.TABLES.GET_ALL);
      return this.extractData(response);
    } catch (error) {
      console.error('Failed to fetch tables:', error);
      throw error;
    }
  }

  /**
   * Get table by ID
   */
  async getTableById(tableId: string) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.TABLES.GET_BY_ID(tableId));
      return this.extractData(response);
    } catch (error) {
      console.error('Failed to fetch table:', error);
      throw error;
    }
  }

  /**
   * Update table status
   * Used by waiter to change billing → occupied
   */
  async updateTableStatus(tableId: string, status: 'available' | 'occupied' | 'billing') {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.TABLES.UPDATE_STATUS(tableId), {
        status,
      });
      return this.extractData(response);
    } catch (error) {
      console.error('Failed to update table status:', error);
      throw error;
    }
  }
}

export default new TableService();
