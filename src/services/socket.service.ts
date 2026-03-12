/**
 * Socket.io Service
 * Real-time communication with backend
 */

import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config/api.config';
import { storage } from './api';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectCallbacks: Array<() => void> = [];
  private lastConnectErrorLogAt = 0;

  /**
   * Register callback to run on reconnect
   */
  onReconnect(callback: () => void) {
    this.reconnectCallbacks.push(callback);
  }

  /**
   * Connect to Socket.io server
   */
  async connect(userId: string, role: 'waiter' | 'cook') {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    try {
      const token = await storage.getToken();

      // Tear down any stale disconnected instance before creating a new one.
      if (this.socket && !this.socket.connected) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      this.socket = io(SOCKET_URL, {
        auth: {
          token,
        },
        // Use polling first so it can negotiate gracefully before upgrading.
        // Websocket-only fails immediately when backend is unavailable.
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: Infinity,
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket?.id);
        this.isConnected = true;

        // Join role-specific room
        this.socket?.emit('join:room', { userId, role });

        // Execute reconnect callbacks
        this.reconnectCallbacks.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.error('Error in reconnect callback:', error);
          }
        });
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
        this.isConnected = false;
      });

      // Use warn instead of error to avoid triggering Expo's dev overlay
      this.socket.on('connect_error', (error) => {
        const now = Date.now();
        // Prevent noisy repeated logs when backend is down
        if (now - this.lastConnectErrorLogAt > 15000) {
          console.warn('Socket connection unavailable (backend offline?):', error.message);
          this.lastConnectErrorLogAt = now;
        }
      });

    } catch (error) {
      console.warn('Failed to initialize socket service:', error);
    }
  }

  /**
   * Disconnect from Socket.io server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Listen for order created events (Kitchen)
   */
  onOrderCreated(callback: (data: any) => void) {
    this.socket?.on('order:created', callback);
    return () => this.socket?.off('order:created', callback);
  }

  /**
   * Listen for order ready events (Waiter)
   */
  onOrderReady(callback: (data: any) => void) {
    this.socket?.on('order:ready', callback);
    return () => this.socket?.off('order:ready', callback);
  }

  /**
   * Listen for order completed events
   */
  onOrderCompleted(callback: (data: any) => void) {
    this.socket?.on('order:completed', callback);
    return () => this.socket?.off('order:completed', callback);
  }

  /**
   * Listen for table updated events
   */
  onTableUpdated(callback: (data: any) => void) {
    this.socket?.on('table:updated', callback);
    return () => this.socket?.off('table:updated', callback);
  }

  /**
   * Listen for order updated events
   */
  onOrderUpdated(callback: (data: any) => void) {
    this.socket?.on('order:updated', callback);
    return () => this.socket?.off('order:updated', callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: any) {
    this.socket?.off(event, callback);
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    this.socket?.removeAllListeners();
  }

  /**
   * Check if socket is connected
   */
  isSocketConnected() {
    return this.isConnected && this.socket?.connected;
  }

  /**
   * Emit order status update to server
   * Falls back to REST if socket not connected
   */
  emitOrderStatusUpdate(orderId: number, status: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.isSocketConnected()) {
        console.warn('Socket not connected, use REST API fallback');
        resolve(false);
        return;
      }

      // Set timeout for acknowledgment
      const timeout = setTimeout(() => {
        console.warn('Socket emit timeout, use REST API fallback');
        this.socket?.off('order:updateStatus:success', successHandler);
        this.socket?.off('order:updateStatus:error', errorHandler);
        resolve(false);
      }, 5000);

      // Listen for success/error acknowledgments
      const successHandler = (data: any) => {
        if (data.orderId === orderId.toString()) {
          clearTimeout(timeout);
          this.socket?.off('order:updateStatus:success', successHandler);
          this.socket?.off('order:updateStatus:error', errorHandler);
          console.log('Order status updated via socket:', data);
          resolve(true);
        }
      };

      const errorHandler = (data: any) => {
        if (data.orderId === orderId.toString()) {
          clearTimeout(timeout);
          this.socket?.off('order:updateStatus:success', successHandler);
          this.socket?.off('order:updateStatus:error', errorHandler);
          console.error('Socket order update failed:', data.error);
          resolve(false);
        }
      };

      this.socket?.once('order:updateStatus:success', successHandler);
      this.socket?.once('order:updateStatus:error', errorHandler);

      // Emit the event
      this.socket?.emit('order:updateStatus', { orderId: orderId.toString(), status });
    });
  }

  /**
   * Emit table status update to server
   * Falls back to REST if socket not connected
   */
  emitTableStatusUpdate(tableId: number, status: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.isSocketConnected()) {
        console.warn('Socket not connected, use REST API fallback');
        resolve(false);
        return;
      }

      const timeout = setTimeout(() => {
        console.warn('Socket emit timeout, use REST API fallback');
        this.socket?.off('table:updateStatus:success', successHandler);
        this.socket?.off('table:updateStatus:error', errorHandler);
        resolve(false);
      }, 5000);

      const successHandler = (data: any) => {
        if (data.tableId === tableId.toString()) {
          clearTimeout(timeout);
          this.socket?.off('table:updateStatus:success', successHandler);
          this.socket?.off('table:updateStatus:error', errorHandler);
          console.log('Table status updated via socket:', data);
          resolve(true);
        }
      };

      const errorHandler = (data: any) => {
        if (data.tableId === tableId.toString()) {
          clearTimeout(timeout);
          this.socket?.off('table:updateStatus:success', successHandler);
          this.socket?.off('table:updateStatus:error', errorHandler);
          console.error('Socket table update failed:', data.error);
          resolve(false);
        }
      };

      this.socket?.once('table:updateStatus:success', successHandler);
      this.socket?.once('table:updateStatus:error', errorHandler);

      this.socket?.emit('table:updateStatus', { tableId: tableId.toString(), status });
    });
  }

  /**
   * Send kitchen alert
   */
  sendKitchenAlert(message: string, orderId?: number) {
    if (this.isSocketConnected()) {
      this.socket?.emit('kitchen:sendAlert', { message, orderId });
    }
  }
}

export default new SocketService();
