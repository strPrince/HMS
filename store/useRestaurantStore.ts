import { create } from 'zustand';
import type { MenuItem, Order, Table } from '../types/restaurant';
import { menuItems as initialMenuItems, tables as initialTables, orders as initialOrders } from '../mocks/restaurant-data';

interface RestaurantStore {
  menuItems: MenuItem[];
  tables: Table[];
  orders: Order[];
  selectedTable: Table | null;
  selectedOrder: Order | null;
  addMenuItem: (item: MenuItem) => void;
  updateMenuItem: (id: string, item: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;
  addTable: (table: Table) => void;
  updateTable: (id: string, table: Partial<Table>) => void;
  deleteTable: (id: string) => void;
  addOrder: (order: Order) => void;
  updateOrder: (id: string, order: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  selectTable: (table: Table | null) => void;
  selectOrder: (order: Order | null) => void;
  getOrderItems: (orderId: string) => { item: MenuItem; quantity: number }[];
  getOrderTotal: (orderId: string) => number;
}

export const useRestaurantStore = create<RestaurantStore>((set, get) => ({
  menuItems: initialMenuItems,
  tables: initialTables,
  orders: initialOrders,
  selectedTable: null,
  selectedOrder: null,

  addMenuItem: (item) => set((state) => ({ menuItems: [...state.menuItems, item] })),
  updateMenuItem: (id, item) => set((state) => ({
    menuItems: state.menuItems.map((mi) => mi.id === id ? { ...mi, ...item } : mi)
  })),
  deleteMenuItem: (id) => set((state) => ({
    menuItems: state.menuItems.filter((mi) => mi.id !== id)
  })),

  addTable: (table) => set((state) => ({ tables: [...state.tables, table] })),
  updateTable: (id, table) => set((state) => ({
    tables: state.tables.map((t) => t.id === id ? { ...t, ...table } : t)
  })),
  deleteTable: (id) => set((state) => ({
    tables: state.tables.filter((t) => t.id !== id)
  })),

  addOrder: (order) => set((state) => ({
    orders: [...state.orders, order],
    tables: state.tables.map((t) => {
      if (t.id !== order.tableId) return t;
      const nextStatus = order.status === 'ready' ? 'ready' : 'occupied';
      return { ...t, status: nextStatus };
    })
  })),
  updateOrder: (id, order) => set((state) => {
    const nextOrders = state.orders.map((o) => o.id === id ? { ...o, ...order } : o);
    const updatedOrder = nextOrders.find((o) => o.id === id);
    if (!updatedOrder || !order.status) {
      return { orders: nextOrders };
    }
    const nextTableStatus =
      order.status === 'closed'
        ? 'free'
        : order.status === 'ready'
        ? 'ready'
        : 'occupied';
    return {
      orders: nextOrders,
      tables: state.tables.map((t) =>
        t.id === updatedOrder.tableId ? { ...t, status: nextTableStatus } : t
      )
    };
  }),
  deleteOrder: (id) => set((state) => ({
    orders: state.orders.filter((o) => o.id !== id)
  })),

  selectTable: (table) => set(() => ({ selectedTable: table })),
  selectOrder: (order) => set(() => ({ selectedOrder: order })),

  getOrderItems: (orderId) => {
    const { orders, menuItems } = get();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return [];
    return order.items.map(({ itemId, quantity }) => {
      const item = menuItems.find((mi) => mi.id === itemId);
      if (!item) return { item: { id: itemId, name: 'Unknown Item', price: 0 }, quantity };
      return { item, quantity };
    });
  },

  getOrderTotal: (orderId) => {
    const items = get().getOrderItems(orderId);
    return items.reduce((total, { item, quantity }) => total + item.price * quantity, 0);
  },
}));
