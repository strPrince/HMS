export type MenuItem = {
  id: string;
  name: string;
  price: number;
  category?: string;
  description?: string;
  isPopular?: boolean;
};

export type TableStatus = 'available' | 'occupied' | 'billing';

export type Table = {
  id: string;
  label: string;
  seats: number;
  status: TableStatus;
  guests?: number;
  elapsedMinutes?: number;
  currentOrderId?: string;
};

export type OrderItemStatus = 'new' | 'preparing' | 'ready';

export type OrderItem = {
  itemId: string;
  quantity: number;
  status?: OrderItemStatus;
  specialInstructions?: string;
  spiceLevel?: string;
  dietPreference?: string;
  customizations?: Record<string, unknown>;
};

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'in-kitchen' | 'ready' | 'billing' | 'served' | 'completed' | 'cancelled';

export type OrderType = 'dine-in' | 'parcel';
export type PaymentMethod = 'cash' | 'card' | 'upi';

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
  orderType?: OrderType;
  paymentMethod?: PaymentMethod;
};
