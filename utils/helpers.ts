import type { Order, TableStatus } from '../types/restaurant';

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

// Format relative time (e.g. 12m ago, 3h ago)
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

// Get order status display text
export const getOrderStatusText = (status: Order['status']): string => {
  const statusMap: Record<Order['status'], string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    'in-kitchen': 'In Kitchen',
    ready: 'Ready',
    billing: 'Billing',
    served: 'Served',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return statusMap[status] ?? status;
};

// Get table status display text
export const getTableStatusText = (status: TableStatus): string => {
  const statusMap: Record<TableStatus, string> = {
    available: 'Available',
    occupied: 'Occupied',
    billing: 'Billing',
  };
  return statusMap[status] ?? status;
};
