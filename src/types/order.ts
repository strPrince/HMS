/**
 * Order Related Types
 */

export type OrderItemStatus = 'pending' | 'preparing' | 'ready';

export type OrderStatus = 'pending' | 'in-kitchen' | 'ready' | 'billing' | 'served' | 'completed' | 'cancelled';

export type OrderItem = {
  itemId: string;
  quantity: number;
  status?: OrderItemStatus;
  specialInstructions?: string;
  spiceLevel?: 'mild' | 'medium' | 'hot';
  dietPreference?: 'veg' | 'non-veg' | 'vegan';
  customizations?: Record<string, unknown>;
};

export type Order = {
  id: string;
  tableId: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  waiterName?: string;
  discountPercent?: number;
};

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  category?: string;
  description?: string;
  isPopular?: boolean;
  image?: string;
  isAvailable?: boolean;
};

export type MenuCategory = {
  id: string;
  name: string;
  icon?: string;
};
