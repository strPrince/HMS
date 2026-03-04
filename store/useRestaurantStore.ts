import { create } from 'zustand';
import type { MenuItem, Order, Table, OrderItem } from '../types/restaurant';
import { menuItems as initialMenuItems, tables as initialTables, orders as initialOrders } from '../mocks/restaurant-data';
import { generateId } from '../src/utils/helpers';
import { getCurrentTimestamp } from '../src/utils/formatDate';

// Cart item type for temporary order creation
type CartItem = OrderItem & {
  specialInstructions?: string;
  spiceLevel?: string;
  dietPreference?: string;
};

interface RestaurantStore {
  menuItems: MenuItem[];
  tables: Table[];
  orders: Order[];
  selectedTable: Table | null;
  selectedOrder: Order | null;
  cart: CartItem[];
  
  // Menu
  addMenuItem: (item: MenuItem) => void;
  updateMenuItem: (id: string, item: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;
  
  // Tables
  addTable: (table: Table) => void;
  updateTable: (id: string, table: Partial<Table>) => void;
  deleteTable: (id: string) => void;
  selectTable: (table: Table | null) => void;
  
  // Orders
  addOrder: (order: Order) => void;
  updateOrder: (id: string, order: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  selectOrder: (order: Order | null) => void;
  submitOrderToKitchen: (tableId: string, waiterName?: string) => Order | null;
  markOrderAsReady: (orderId: string) => void;
  moveOrderToBilling: (orderId: string) => void;
  completeOrder: (orderId: string, discountPercent?: number) => void;
  
  // Cart Management
  addToCart: (item: CartItem) => void;
  updateCartItem: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemCount: () => number;
  
  // Helpers
  getOrderItems: (orderId: string) => { item: MenuItem; quantity: number }[];
  getOrderTotal: (orderId: string) => number;
  getTableActiveOrder: (tableId: string) => Order | null;
  getKitchenOrders: () => Order[];
}

export const useRestaurantStore = create<RestaurantStore>((set, get) => ({
  menuItems: initialMenuItems,
  tables: initialTables,
  orders: initialOrders,
  selectedTable: null,
  selectedOrder: null,
  cart: [],

  // Menu Actions
  addMenuItem: (item) => set((state) => ({ menuItems: [...state.menuItems, item] })),
  updateMenuItem: (id, item) => set((state) => ({
    menuItems: state.menuItems.map((mi) => mi.id === id ? { ...mi, ...item } : mi)
  })),
  deleteMenuItem: (id) => set((state) => ({
    menuItems: state.menuItems.filter((mi) => mi.id !== id)
  })),

  // Table Actions
  addTable: (table) => set((state) => ({ tables: [...state.tables, table] })),
  updateTable: (id, table) => set((state) => ({
    tables: state.tables.map((t) => t.id === id ? { ...t, ...table } : t)
  })),
  deleteTable: (id) => set((state) => ({
    tables: state.tables.filter((t) => t.id !== id)
  })),
  
  // Order Actions
  addOrder: (order) => set((state) => ({
    orders: [...state.orders, order],
    tables: state.tables.map((t) => {
      if (t.id !== order.tableId) return t;
      return { ...t, status: 'occupied' as const, currentOrderId: order.id };
    })
  })),
  
  updateOrder: (id, order) => set((state) => {
    const nextOrders = state.orders.map((o) => o.id === id ? { ...o, ...order } : o);
    const updatedOrder = nextOrders.find((o) => o.id === id);
    if (!updatedOrder) {
      return { orders: nextOrders };
    }
    // Update table status based on order status
    let nextTableStatus: 'available' | 'occupied' | 'billing' = 'occupied';
    if (updatedOrder.status === 'completed') {
      nextTableStatus = 'available';
    } else if (updatedOrder.status === 'billing') {
      nextTableStatus = 'billing';
    }
    return {
      orders: nextOrders,
      tables: state.tables.map((t) =>
        t.id === updatedOrder.tableId 
          ? { ...t, status: nextTableStatus, currentOrderId: updatedOrder.status === 'completed' ? undefined : updatedOrder.id } 
          : t
      )
    };
  }),
  
  deleteOrder: (id) => set((state) => ({
    orders: state.orders.filter((o) => o.id !== id)
  })),
  
  selectOrder: (order) => set(() => ({ selectedOrder: order })),
  
  // Helper Functions
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
  
  getTableActiveOrder: (tableId) => {
    const { orders } = get();
    return orders.find((o) => 
      o.tableId === tableId && 
      (o.status === 'in-kitchen' || o.status === 'ready' || o.status === 'billing')
    ) || null;
  },
  
  getKitchenOrders: () => {
    const { orders } = get();
    return orders.filter((o) => o.status === 'in-kitchen' || o.status === 'ready');
  },
  
  submitOrderToKitchen: (tableId, waiterName) => {
    const { cart } = get();
    if (cart.length === 0) return null;
    
    const newOrder: Order = {
      id: `order-${Date.now()}`,
      tableId,
      items: cart,
      status: 'in-kitchen',
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      ...(waiterName && { waiterName }),
    };
    
    set((state) => ({
      orders: [...state.orders, newOrder],
      tables: state.tables.map((t) =>
        t.id === tableId 
          ? { ...t, status: 'occupied' as const, currentOrderId: newOrder.id }
          : t
      ),
      cart: [],
    }));
    
    return newOrder;
  },
  
  markOrderAsReady: (orderId) => set((state) => ({
    orders: state.orders.map((o) =>
      o.id === orderId ? { ...o, status: 'ready' as const, updatedAt: getCurrentTimestamp() } : o
    ),
  })),
  
  moveOrderToBilling: (orderId) => set((state) => {
    const order = state.orders.find((o) => o.id === orderId);
    if (!order) return state;
    
    return {
      orders: state.orders.map((o) =>
        o.id === orderId ? { ...o, status: 'billing' as const, updatedAt: getCurrentTimestamp() } : o
      ),
      tables: state.tables.map((t) =>
        t.id === order.tableId ? { ...t, status: 'billing' as const } : t
      ),
    };
  }),
  
  completeOrder: (orderId, discountPercent) => set((state) => {
    const order = state.orders.find((o) => o.id === orderId);
    if (!order) return state;
    
    return {
      orders: state.orders.map((o) =>
        o.id === orderId 
          ? { ...o, status: 'completed' as const, updatedAt: getCurrentTimestamp(), discountPercent } 
          : o
      ),
      tables: state.tables.map((t) =>
        t.id === order.tableId ? { ...t, status: 'available' as const, currentOrderId: undefined } : t
      ),
    };
  }),
  
  // Cart Actions
  addToCart: (item) => set((state) => {
    const existingItemIndex = state.cart.findIndex((i) => i.itemId === item.itemId);
    if (existingItemIndex >= 0) {
      const newCart = [...state.cart];
      newCart[existingItemIndex] = {
        ...newCart[existingItemIndex],
        quantity: newCart[existingItemIndex].quantity + item.quantity,
      };
      return { cart: newCart };
    }
    return { cart: [...state.cart, item] };
  }),
  
  updateCartItem: (itemId, quantity) => set((state) => {
    if (quantity <= 0) {
      return { cart: state.cart.filter((i) => i.itemId !== itemId) };
    }
    return {
      cart: state.cart.map((i) =>
        i.itemId === itemId ? { ...i, quantity } : i
      ),
    };
  }),
  
  removeFromCart: (itemId) => set((state) => ({
    cart: state.cart.filter((i) => i.itemId !== itemId),
  })),
  
  clearCart: () => set(() => ({ cart: [] })),
  
  getCartTotal: () => {
    const { cart, menuItems } = get();
    return cart.reduce((total, { itemId, quantity }) => {
      const item = menuItems.find((mi) => mi.id === itemId);
      return total + (item?.price || 0) * quantity;
    }, 0);
  },
  
  getCartItemCount: () => {
    const { cart } = get();
    return cart.reduce((count, { quantity }) => count + quantity, 0);
  }
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
