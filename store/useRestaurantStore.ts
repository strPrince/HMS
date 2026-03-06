import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MenuItem, Order, Table, OrderItem, OrderType, PaymentMethod } from '../types/restaurant';
import { menuItems as initialMenuItems, tables as initialTables, orders as initialOrders } from '../mocks/restaurant-data';
import { getCurrentTimestamp } from '../src/utils/formatDate';
import MenuService from '../src/services/menu.service';
import TableService from '../src/services/table.service';
import OrderService from '../src/services/order.service';

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
  orderType: OrderType;

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
  submitOrderToKitchen: (tableId: string, waiterName?: string) => Promise<Order | null>;
  markOrderAsReady: (orderId: string) => Promise<void>;
  moveOrderToBilling: (orderId: string) => Promise<void>;
  completeOrder: (orderId: string, discountPercent?: number, paymentMethod?: PaymentMethod) => void;

  // Cart Management
  addToCart: (item: CartItem) => void;
  updateCartItem: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemCount: () => number;

  // Order type
  setOrderType: (type: OrderType) => void;

  // Helpers
  getOrderItems: (orderId: string) => { item: MenuItem; quantity: number }[];
  getOrderTotal: (orderId: string) => number;
  getTableActiveOrder: (tableId: string) => Order | null;
  getKitchenOrders: () => Order[];

  // Backend sync
  loadInitialData: () => Promise<void>;
  refreshOrdersFromApi: () => Promise<void>;
}

const toNumber = (id: string | number) => {
  if (typeof id === 'number') return id;
  const parsed = parseInt(String(id).replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const mapTableStatus = (status: string): Table['status'] => {
  if (status === 'available' || status === 'occupied' || status === 'billing') return status;
  return 'occupied';
};

const mapOrderStatus = (status: string): Order['status'] => {
  if (status === 'ready') return 'ready';
  if (status === 'billing') return 'billing';
  if (status === 'served') return 'served';
  if (status === 'completed') return 'completed';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'pending') return 'pending';
  return 'in-kitchen';
};

const mapOrderItemStatus = (status?: string): OrderItem['status'] => {
  if (status === 'ready') return 'ready';
  if (status === 'preparing') return 'preparing';
  return 'new';
};

const mapMenuItemFromApi = (item: any): MenuItem => ({
  id: `m${item.id}`,
  name: item.name,
  description: item.description || '',
  price: Number(item.price || 0),
  category: item.category?.name,
  isPopular: false,
});

const mapTableFromApi = (table: any): Table => ({
  id: `t${table.id}`,
  label: table.tableNumber,
  seats: table.capacity || 4,
  status: mapTableStatus(table.status),
  currentOrderId: table.currentOrderId ? `o${table.currentOrderId}` : undefined,
});

const mapOrderFromApi = (order: any): Order => ({
  id: `o${order.id}`,
  tableId: order.tableId ? `t${order.tableId}` : 't0',
  status: mapOrderStatus(order.status),
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  notes: order.specialNotes || '',
  waiterName: order.waiter?.name,
  orderType: order.orderType === 'parcel' ? 'parcel' : 'dine-in',
  paymentMethod: order.paymentMethod || undefined,
  items: (order.orderItems || order.items || []).map((line: any) => ({
    itemId: `m${line.menuItemId || line.menuItem?.id}`,
    quantity: line.quantity,
    status: mapOrderItemStatus(line.status),
    specialInstructions: line.specialInstructions || '',
  })),
});

export const useRestaurantStore = create<RestaurantStore>()(
  persist(
    (set, get) => ({
      menuItems: initialMenuItems,
      tables: initialTables,
      orders: initialOrders,
      selectedTable: null,
      selectedOrder: null,
      cart: [],
      orderType: 'dine-in',

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
        if (updatedOrder.status === 'completed' || updatedOrder.status === 'cancelled') {
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
          (o.status === 'in-kitchen' || o.status === 'ready' || o.status === 'billing' || o.status === 'pending')
        ) || null;
      },

      getKitchenOrders: () => {
        const { orders } = get();
        return orders.filter((o) => o.status === 'in-kitchen' || o.status === 'ready');
      },

      loadInitialData: async () => {
        try {
          const [menuRaw, tablesRaw, ordersRaw] = await Promise.all([
            MenuService.getMenuItems(),
            TableService.getTables(),
            OrderService.getOrders(),
          ]);

          // Only replace state with API data if the response is non-empty.
          // An empty array from the API means the backend has no records yet,
          // so we keep the mock fallback data to avoid a blank UI.
          const apiMenuItems = Array.isArray(menuRaw) && menuRaw.length > 0
            ? menuRaw.map(mapMenuItemFromApi)
            : null;
          const apiTables = Array.isArray(tablesRaw) && tablesRaw.length > 0
            ? tablesRaw.map(mapTableFromApi)
            : null;
          const apiOrders = Array.isArray(ordersRaw) && ordersRaw.length > 0
            ? ordersRaw.map(mapOrderFromApi)
            : null;

          set((state) => ({
            menuItems: apiMenuItems ?? state.menuItems,
            tables: apiTables ?? state.tables,
            orders: apiOrders ?? state.orders,
          }));
        } catch (error) {
          console.warn('Backend unavailable, using local mock data:', (error as any)?.message);
          // Only set mock data if state is already empty (first load)
          const { tables, menuItems, orders } = get();
          if (tables.length === 0) set({ menuItems: initialMenuItems, tables: initialTables, orders: initialOrders });
        }
      },

      refreshOrdersFromApi: async () => {
        try {
          const ordersRaw = await OrderService.getOrders();
          if (Array.isArray(ordersRaw)) {
            set({ orders: ordersRaw.map(mapOrderFromApi) });
          }
        } catch (error) {
          console.error('Failed to refresh orders from API:', error);
        }
      },

      submitOrderToKitchen: async (tableId, waiterName) => {
        const { cart, orderType, menuItems } = get();
        if (cart.length === 0) return null;

        let created: any = null;
        try {
          created = await OrderService.createOrder({
            tableId: toNumber(tableId),
            orderType: orderType === 'parcel' ? 'parcel' : 'dine_in',
            items: cart.map((item) => ({
              menuItemId: toNumber(item.itemId),
              quantity: item.quantity,
              specialInstructions: item.specialInstructions,
            })),
          });
        } catch (error) {
          console.warn('API unavailable, creating order locally:', (error as any)?.message);
        }

        // Build the order — from API response if available, or locally
        let mappedOrder;
        if (created) {
          mappedOrder = mapOrderFromApi(created);
        } else {
          // Local fallback: build order from cart data
          const localId = `o${Date.now()}`;
          mappedOrder = {
            id: localId,
            tableId,
            status: 'in-kitchen' as const,
            createdAt: new Date().toISOString(),
            waiterName,
            orderType: orderType,
            items: cart.map((item) => ({
              itemId: item.itemId,
              quantity: item.quantity,
              status: 'new' as const,
              specialInstructions: item.specialInstructions || '',
            })),
          };
        }

        set((state) => ({
          orders: [mappedOrder, ...state.orders.filter((o) => o.id !== mappedOrder.id)],
          tables: state.tables.map((t) =>
            t.id === tableId
              ? { ...t, status: 'occupied' as const, currentOrderId: mappedOrder.id }
              : t
          ),
          cart: [],
          orderType: 'dine-in',
        }));

        return mappedOrder;
      },

      markOrderAsReady: async (orderId) => {
        // Optimistic local update
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, status: 'ready' as const, updatedAt: getCurrentTimestamp() } : o
          ),
        }));

        // Sync to backend
        try {
          const numericId = String(toNumber(orderId));
          await OrderService.updateOrder(numericId, { status: 'ready' });
        } catch (error) {
          console.warn('Failed to sync markOrderAsReady to backend:', (error as any)?.message);
        }
      },

      moveOrderToBilling: async (orderId) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) return;

        // Optimistic local update
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, status: 'billing' as const, updatedAt: getCurrentTimestamp() } : o
          ),
          tables: state.tables.map((t) =>
            t.id === order.tableId ? { ...t, status: 'billing' as const } : t
          ),
        }));

        // Sync to backend
        try {
          const numericId = String(toNumber(orderId));
          await OrderService.updateOrder(numericId, { status: 'served' });
        } catch (error) {
          console.warn('Failed to sync moveOrderToBilling to backend:', (error as any)?.message);
        }
      },

      completeOrder: (orderId, discountPercent, paymentMethod) => set((state) => {
        const order = state.orders.find((o) => o.id === orderId);
        if (!order) return state;

        return {
          orders: state.orders.map((o) =>
            o.id === orderId
              ? { ...o, status: 'completed' as const, updatedAt: getCurrentTimestamp(), discountPercent, paymentMethod }
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
      },

      selectTable: (table) => set(() => ({ selectedTable: table })),

      setOrderType: (type) => set(() => ({ orderType: type })),
    }),
    {
      name: 'hms-restaurant-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        orders: state.orders,
        tables: state.tables,
        menuItems: state.menuItems,
      }),
    }
  )
);
