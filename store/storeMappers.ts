/**
 * Pure utility functions for mapping API responses to local store types.
 * Extracted from useRestaurantStore.ts for maintainability.
 */
import type { MenuItem, Order, Table, OrderItem } from '../types/restaurant';

// ── Network / Auth helpers ──────────────────────────────────────────

let lastOfflineWarnAt = 0;

export const isNetworkLikeError = (error: any): boolean => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('network error') || message.includes('timeout') || message.includes('xhr');
};

export const isAuthError = (error: any): boolean => {
  return error?.response?.status === 401;
};

export const warnOfflineOnce = (scope: string, error: any): void => {
  const now = Date.now();
  if (now - lastOfflineWarnAt < 15000) return;
  const message = error?.message || 'Network unavailable';
  console.warn(`[Offline] ${scope}: ${message}`);
  lastOfflineWarnAt = now;
};

// ── ID helpers ──────────────────────────────────────────────────────

export const toNumber = (id: string | number): number => {
  if (typeof id === 'number') return id;
  const parsed = parseInt(String(id).replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getApiId = (input: any): string | number | undefined => {
  return input?.id ?? input?._id ?? input?.menuItemId ?? input?.menu_item_id ?? input?.tableId ?? input?.table_id;
};

// ── Array normalizer ────────────────────────────────────────────────

export const normalizeArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.results)) return value.results;
  if (Array.isArray(value.list)) return value.list;
  if (Array.isArray(value.orders)) return value.orders;
  if (Array.isArray(value.tables)) return value.tables;
  if (Array.isArray(value.menuItems)) return value.menuItems;
  return [];
};

// ── Status mappers ──────────────────────────────────────────────────

export const mapTableStatus = (status: string): Table['status'] => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'available' || normalized === 'free') return 'available';
  if (normalized === 'occupied' || normalized === 'busy') return 'occupied';
  if (normalized === 'billing') return 'billing';
  return 'occupied';
};

export const mapOrderStatus = (status: string): Order['status'] => {
  const normalized = String(status || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (normalized === 'in_kitchen' || normalized === 'in-kitchen' || normalized === 'inkitchen') return 'in-kitchen';
  if (normalized === 'new') return 'pending';
  if (normalized === 'confirmed') return 'confirmed';
  if (normalized === 'preparing') return 'preparing';
  if (normalized === 'ready') return 'ready';
  if (normalized === 'billing') return 'billing';
  if (normalized === 'served') return 'served';
  if (normalized === 'completed') return 'completed';
  if (normalized === 'cancelled') return 'cancelled';
  if (normalized === 'pending') return 'pending';
  return 'pending';
};

export const mapOrderItemStatus = (status?: string): OrderItem['status'] => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'pending' || normalized === 'new') return 'new';
  if (normalized === 'ready') return 'ready';
  if (normalized === 'preparing') return 'preparing';
  return 'new';
};

// ── API → Local mappers ─────────────────────────────────────────────

export const mapMenuItemFromApi = (item: any): MenuItem => ({
  id: `m${String(getApiId(item) ?? '')}`,
  name: item.name || item.title || 'Unnamed Item',
  description: item.description || '',
  price: Number(item.price || 0),
  category: item.category?.name || item.categoryName || item.category,
  isPopular: false,
});

export const mapTableFromApi = (table: any): Table => ({
  id: `t${String(getApiId(table) ?? '')}`,
  label: String(table.tableNumber || table.label || table.number || table.name || ''),
  seats: table.capacity || 4,
  status: mapTableStatus(String(table.status || 'occupied')),
  currentOrderId: table.currentOrderId || table.current_order_id ? `o${table.currentOrderId || table.current_order_id}` : undefined,
});

export const mapOrderFromApi = (order: any): Order => ({
  id: `o${String(getApiId(order) ?? '')}`,
  tableId: order.tableId || order.table_id || order.table?.id ? `t${order.tableId || order.table_id || order.table?.id}` : 't0',
  status: mapOrderStatus(String(order.status || 'in-kitchen')),
  createdAt: order.createdAt || order.created_at || new Date().toISOString(),
  updatedAt: order.updatedAt || order.updated_at,
  notes: order.specialNotes || order.special_notes || order.notes || '',
  waiterName: order.waiter?.name,
  orderType:
    String(order.orderType || order.order_type || '')
      .toLowerCase()
      .replace(/_/g, '-') === 'parcel'
      ? 'parcel'
      : 'dine-in',
  paymentMethod: order.paymentMethod || undefined,
  items: (order.orderItems || order.order_items || order.items || []).map((line: any) => ({
    itemId: `m${String(getApiId(line?.menuItem ? line.menuItem : line) || line?.menuItem?.id || line?.item?.id || '')}`,
    quantity: line.quantity,
    status: mapOrderItemStatus(line.status),
    specialInstructions: line.specialInstructions || line?.customizations?.notes || '',
    spiceLevel: line?.spiceLevel || line?.customizations?.spiceLevel || '',
    dietPreference: line?.dietPreference || line?.customizations?.dietPreference || '',
    customizations: line?.customizations || {},
  })),
});
