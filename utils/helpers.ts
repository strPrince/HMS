import type { Order, MenuItem, TableStatus } from '../types/restaurant';

// Generate unique ID
export const generateId = (prefix: string = ''): string => {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).substr(2, 9)}`;
};

// Format currency (INR)
export const formatCurrency = (amount: number): string => {
  return `₹${amount.toFixed(2)}`;
};

// Format date
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format relative time (e.g. 12h ago)
export const formatTimeAgo = (dateString: string): string => {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffMs = Math.max(0, now - date);
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

// Format duration from minutes (e.g. 14h 17m)
export const formatDuration = (minutes: number | undefined): string => {
  if (!minutes && minutes !== 0) return '';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
};

// Calculate order total
export const calculateOrderTotal = (order: Order, menuItems: MenuItem[]): number => {
  return order.items.reduce((total, { itemId, quantity }) => {
    const item = menuItems.find((mi) => mi.id === itemId);
    return total + (item?.price || 0) * quantity;
  }, 0);
};

// Get order status text
export const getOrderStatusText = (status: Order['status']): string => {
  const statusMap: Record<Order['status'], string> = {
    open: 'Open',
    preparing: 'Preparing',
    ready: 'Ready',
    closed: 'Closed',
  };
  return statusMap[status] || status;
};

// Get table status text
export const getTableStatusText = (status: TableStatus): string => {
  const statusMap: Record<TableStatus, string> = {
    free: 'Free',
    occupied: 'Occupied',
    ready: 'Ready',
  };
  return statusMap[status] || status;
};

// Validate email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};
