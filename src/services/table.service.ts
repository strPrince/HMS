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

  private getErrorMessage(error: any) {
    return error?.message || error?.response?.data?.message || 'Unknown error';
  }

  private isAuthError(error: any) {
    return error?.response?.status === 401;
  }

  /**
   * Get all tables
   */
  async getTables() {
    try {
      const response = await apiClient.get(API_ENDPOINTS.TABLES.GET_ALL);
      return this.extractData(response);
    } catch (error) {
      if (!this.isAuthError(error)) {
        console.warn(`Failed to fetch tables: ${this.getErrorMessage(error)}`);
      }
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
      if (!this.isAuthError(error)) {
        console.warn(`Failed to fetch table: ${this.getErrorMessage(error)}`);
      }
      throw error;
    }
  }

  /**
   * Update table status
   * Used by waiter to change billing → occupied
   */
  async updateTableStatus(tableId: string, status: 'available' | 'occupied' | 'billing') {
    try {
      let response;
      try {
        response = await apiClient.patch(API_ENDPOINTS.TABLES.UPDATE_STATUS(tableId), { status });
      } catch {
        response = await apiClient.put(API_ENDPOINTS.TABLES.UPDATE_STATUS(tableId), { status });
      }
      return this.extractData(response);
    } catch (error) {
      if (!this.isAuthError(error)) {
        console.warn(`Failed to update table status: ${this.getErrorMessage(error)}`);
      }
      throw error;
    }
  }
}

export default new TableService();
