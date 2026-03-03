export type MenuItem = {
  id: string;
  name: string;
  price: number;
  category?: string;
  description?: string;
  isPopular?: boolean;
};

export type TableStatus = 'free' | 'occupied' | 'ready';

export type Table = {
  id: string;
  label: string;
  seats: number;
  status: TableStatus;
  guests?: number;
  elapsedMinutes?: number;
};

export type OrderItem = {
  itemId: string;
  quantity: number;
  status?: 'new' | 'ready';
};

export type Order = {
  id: string;
  tableId: string;
  items: OrderItem[];
  status: 'open' | 'preparing' | 'ready' | 'closed';
  createdAt: string;
  notes?: string;
};
