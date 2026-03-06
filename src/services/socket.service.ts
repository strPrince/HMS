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

  /**
   * Connect to Socket.io server
   */
  async connect(userId: string, role: 'waiter' | 'cook' | 'manager') {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    try {
      const token = await storage.getToken();

      this.socket = io(SOCKET_URL, {
        auth: {
          token,
        },
        // Use polling first so it can negotiate gracefully before upgrading.
        // Websocket-only fails immediately when backend is unavailable.
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 3,
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket?.id);
        this.isConnected = true;

        // Join role-specific room
        this.socket?.emit('join:room', { userId, role });
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
        this.isConnected = false;
      });

      // Use warn instead of error to avoid triggering Expo's dev overlay
      this.socket.on('connect_error', (error) => {
        console.warn('Socket connection unavailable (backend offline?):', error.message);
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
  }

  /**
   * Listen for order ready events (Waiter)
   */
  onOrderReady(callback: (data: any) => void) {
    this.socket?.on('order:ready', callback);
  }

  /**
   * Listen for order completed events
   */
  onOrderCompleted(callback: (data: any) => void) {
    this.socket?.on('order:completed', callback);
  }

  /**
   * Listen for table updated events
   */
  onTableUpdated(callback: (data: any) => void) {
    this.socket?.on('table:updated', callback);
  }

  /**
   * Listen for order updated events
   */
  onOrderUpdated(callback: (data: any) => void) {
    this.socket?.on('order:updated', callback);
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
}

export default new SocketService();
