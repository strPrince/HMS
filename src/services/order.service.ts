/**
 * Order Service
 * Handles all order-related API calls
 */

import apiClient from './api';
import { API_ENDPOINTS } from '../config/api.config';
import type { Order } from '../types/order';

export interface CreateOrderRequest {
  tableId: number;
  orderType: 'dine_in' | 'parcel';
  items: {
    menuItemId: number;
    quantity: number;
    specialInstructions?: string;
  }[];
  customerName?: string;
  customerPhone?: string;
}

class OrderService {
  private extractData(response: any) {
    return response?.data?.data ?? response?.data;
  }

  /**
   * Get all orders with optional filters
   */
  async getOrders(params?: {
    status?: string;
    order_type?: string;
    table_id?: string;
  }) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ORDERS.GET_ALL, { params });
      return this.extractData(response);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      throw error;
    }
  }

  /**
   * Get kitchen orders queue
   */
  async getKitchenOrders(type?: 'all' | 'dine-in' | 'parcel') {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ORDERS.KITCHEN_QUEUE, {
        params: { type },
      });
      return this.extractData(response);
    } catch (error) {
      console.error('Failed to fetch kitchen orders:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ORDERS.GET_BY_ID(orderId));
      return this.extractData(response);
    } catch (error) {
      console.error('Failed to fetch order:', error);
      throw error;
    }
  }

  /**
   * Create new order (Waiter only)
   */
  async createOrder(orderData: CreateOrderRequest) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.ORDERS.CREATE, orderData);
      return this.extractData(response);
    } catch (error) {
      console.error('Failed to create order:', error);
      throw error;
    }
  }

  /**
   * Update order (status/customer details)
   */
  async updateOrder(orderId: string, payload: { status?: string; customerName?: string; customerPhone?: string }) {
    try {
      const response = await apiClient.put(API_ENDPOINTS.ORDERS.UPDATE(orderId), payload);
      return this.extractData(response);
    } catch (error) {
      console.error('Failed to update order:', error);
      throw error;
    }
  }
}

export default new OrderService();
