/**
 * Bill Service
 * Handles all bill-related API calls
 */

import apiClient from './api';
import { API_ENDPOINTS } from '../config/api.config';

export interface GenerateBillRequest {
  discountPercent?: number;
  discountReason?: string;
}

export interface RecordPaymentRequest {
  paymentMethod: 'cash' | 'card' | 'upi';
  amountPaid: number;
  tip?: number;
}

class BillService {
  private extractData(response: any) {
    return response?.data?.data ?? response?.data;
  }

  /**
   * Get all bills
   */
  async getBills(params?: { startDate?: string; endDate?: string }) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.BILLS.GET_ALL, { params });
      return this.extractData(response);
    } catch (error) {
      console.error('Failed to fetch bills:', error);
      throw error;
    }
  }

  /**
   * Get bill by ID
   */
  async getBillById(billId: string) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.BILLS.GET_BY_ID(billId));
      return this.extractData(response);
    } catch (error) {
      console.error('Failed to fetch bill:', error);
      throw error;
    }
  }

  /**
   * Get bill by order ID
   */
  async getBillByOrderId(orderId: string) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.BILLS.GET_BY_ORDER(orderId));
      return this.extractData(response);
    } catch (error) {
      console.error('Failed to fetch bill by order:', error);
      throw error;
    }
  }

  /**
   * Generate bill for an order
   */
  async generateBill(orderId: string, data?: GenerateBillRequest) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.BILLS.GENERATE(orderId), data || {});
      return this.extractData(response);
    } catch (error) {
      console.error('Failed to generate bill:', error);
      throw error;
    }
  }

  /**
   * Record payment for a bill
   */
  async recordPayment(billId: string, data: RecordPaymentRequest) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.BILLS.RECORD_PAYMENT(billId), data);
      return this.extractData(response);
    } catch (error) {
      console.error('Failed to record payment:', error);
      throw error;
    }
  }
}

export default new BillService();
