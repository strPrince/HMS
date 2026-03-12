/**
 * Order Service
 * Handles all order-related API calls
 */

import apiClient from './api';
import { API_ENDPOINTS } from '../config/api.config';
import type { Order } from '../types/order';

export interface CreateOrderRequest {
  tableId: number;
  orderType: 'dine_in';
  items: {
    menuItemId: number;
    quantity: number;
    specialInstructions?: string;
    customizations?: Record<string, unknown>;
  }[];
  customerName?: string;
  customerPhone?: string;
}

class OrderService {
  private extractData(response: any) {
    return response?.data?.data ?? response?.data;
  }

  private getErrorMessage(error: any) {
    return error?.message || error?.response?.data?.message || 'Unknown error';
  }

  private isAuthError(error: any) {
    return error?.response?.status === 401;
  }

  private buildPayloadVariants(payload: { status?: string; customerName?: string; customerPhone?: string }) {
    if (!payload?.status) return [payload];

    const { status, ...rest } = payload;
    return [{ ...rest, status }];
  }

  private async tryUpdateOrder(
    orderId: string,
    payload: { status?: string; customerName?: string; customerPhone?: string },
    methods: Array<'put' | 'patch'>
  ) {
    const payloadVariants = this.buildPayloadVariants(payload);
    let lastError: any = null;

    for (const method of methods) {
      for (const body of payloadVariants) {
        try {
          const response =
            method === 'put'
              ? await apiClient.put(API_ENDPOINTS.ORDERS.UPDATE(orderId), body)
              : await apiClient.patch(API_ENDPOINTS.ORDERS.UPDATE(orderId), body);
          return this.extractData(response);
        } catch (error: any) {
          lastError = error;
        }
      }
    }

    throw lastError;
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
      if (!this.isAuthError(error)) {
        console.warn(`Failed to fetch orders: ${this.getErrorMessage(error)}`);
      }
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
      if (!this.isAuthError(error)) {
        console.warn(`Failed to fetch kitchen orders: ${this.getErrorMessage(error)}`);
      }
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
      if (!this.isAuthError(error)) {
        console.warn(`Failed to fetch order: ${this.getErrorMessage(error)}`);
      }
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
      if (!this.isAuthError(error)) {
        console.warn(`Failed to create order: ${this.getErrorMessage(error)}`);
      }
      throw error;
    }
  }

  /**
   * Update order using explicit PUT endpoint
   * Required by kitchen flow status updates
   */
  async updateOrderPut(orderId: string, payload: { status?: string; customerName?: string; customerPhone?: string }) {
    try {
      return await this.tryUpdateOrder(orderId, payload, ['put', 'patch']);
    } catch (error) {
      if (!this.isAuthError(error)) {
        console.warn(`Failed to update order with PUT: ${this.getErrorMessage(error)}`);
      }
      throw error;
    }
  }

  /**
   * Update order (status/customer details)
   */
  async updateOrder(orderId: string, payload: { status?: string; customerName?: string; customerPhone?: string }) {
    try {
      return await this.tryUpdateOrder(orderId, payload, ['put', 'patch']);
    } catch (error) {
      if (!this.isAuthError(error)) {
        console.warn(`Failed to update order: ${this.getErrorMessage(error)}`);
      }
      throw error;
    }
  }

  /**
   * Send billing request notification to manager
   */
  async sendBillingRequest(data: {
    tableId: number;
    orderId: number;
    tableLabel: string;
    waiterName: string;
    itemCount: number;
    total: number;
  }) {
    try {
      const response = await apiClient.post('/orders/billing-request', data);
      return this.extractData(response);
    } catch (error) {
      if (!this.isAuthError(error)) {
        console.warn(`Failed to send billing request: ${this.getErrorMessage(error)}`);
      }
      throw error;
    }
  }
}

export default new OrderService();
