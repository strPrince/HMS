import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MenuItem, Order, Table, OrderItem, OrderType, PaymentMethod } from '../types/restaurant';
import { getCurrentTimestamp } from '../utils/helpers';
import MenuService from '../src/services/menu.service';
import TableService from '../src/services/table.service';
import OrderService from '../src/services/order.service';
import socketService from '../src/services/socket.service';
import {
  isNetworkLikeError,
  isAuthError,
  warnOfflineOnce,
  toNumber,
  normalizeArray,
  mapMenuItemFromApi,
  mapTableFromApi,
  mapOrderFromApi,
} from './storeMappers';

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
  updateTableStatus: (tableId: string, status: Table['status']) => Promise<void>;
  deleteTable: (id: string) => void;
  selectTable: (table: Table | null) => void;

  // Orders
  addOrder: (order: Order) => void;
  updateOrder: (id: string, order: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  selectOrder: (order: Order | null) => void;
  submitOrderToKitchen: (tableId: string, waiterName?: string, customerPhone?: string) => Promise<Order | null>;
  markOrderAsReady: (orderId: string) => Promise<void>;
  markOrderAsDelivered: (orderId: string) => Promise<void>;
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
  getTableAllActiveOrders: (tableId: string) => Order[];
  getTableCombinedItems: (tableId: string) => { item: MenuItem; quantity: number }[];
  getTableCombinedTotal: (tableId: string) => number;
  getKitchenOrders: () => Order[];

  // Backend sync
  loadInitialData: () => Promise<void>;
  refreshOrdersFromApi: () => Promise<void>;
  refreshTablesFromApi: () => Promise<void>;
  refreshMenuFromApi: () => Promise<void>;
}

export const useRestaurantStore = create<RestaurantStore>()(
  persist(
    (set, get) => ({
      menuItems: [],
      tables: [],
      orders: [],
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
      updateTableStatus: async (tableId, status) => {
        // Optimistic local update
        set((state) => ({
          tables: state.tables.map((t) =>
            t.id === tableId ? { ...t, status, updatedAt: getCurrentTimestamp() } : t
          ),
        }));

        // Try socket emit first, fallback to REST
        try {
          const numericId = toNumber(tableId);
          const socketSuccess = await socketService.emitTableStatusUpdate(numericId, status);
          
          if (!socketSuccess) {
            // Socket failed or not connected, use REST API
            console.log('Using REST API fallback for updateTableStatus');
            await TableService.updateTableStatus(String(numericId), status);
          }
          
          // Refresh from server to ensure consistency
          await get().refreshTablesFromApi();
        } catch (error) {
          console.warn('Failed to sync updateTableStatus to backend:', (error as any)?.message);
          try { await get().refreshTablesFromApi(); } catch (_) {}
        }
      },
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
          (o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing' || o.status === 'in-kitchen' || o.status === 'ready' || o.status === 'billing')
        ) || null;
      },

      getTableAllActiveOrders: (tableId) => {
        const { orders } = get();
        return orders.filter((o) =>
          o.tableId === tableId &&
          o.status !== 'cancelled' && o.status !== 'completed'
        );
      },

      getTableCombinedItems: (tableId) => {
        const allOrders = get().getTableAllActiveOrders(tableId);
        const { menuItems } = get();
        const map = new Map<string, { item: MenuItem; quantity: number }>();
        for (const order of allOrders) {
          for (const { itemId, quantity } of order.items) {
            const item = menuItems.find((mi) => mi.id === itemId) || { id: itemId, name: 'Item', price: 0 };
            const existing = map.get(itemId);
            if (existing) {
              map.set(itemId, { ...existing, quantity: existing.quantity + quantity });
            } else {
              map.set(itemId, { item, quantity });
            }
          }
        }
        return Array.from(map.values());
      },

      getTableCombinedTotal: (tableId) => {
        const items = get().getTableCombinedItems(tableId);
        return items.reduce((sum, { item, quantity }) => sum + item.price * quantity, 0);
      },

      getKitchenOrders: () => {
        const { orders } = get();
        return orders.filter((o) => o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing' || o.status === 'in-kitchen' || o.status === 'ready');
      },

      loadInitialData: async () => {
        try {
          // Use Promise.allSettled to load independently - don't let one failure block others
          const [menuResult, tablesResult, ordersResult] = await Promise.allSettled([
            MenuService.getMenuItems(),
            TableService.getTables(),
            OrderService.getOrders(),
          ]);

          const apiMenuItems = menuResult.status === 'fulfilled' 
            ? normalizeArray(menuResult.value).map(mapMenuItemFromApi).filter((item) => item.id !== 'm')
            : [];
          const apiTables = tablesResult.status === 'fulfilled'
            ? normalizeArray(tablesResult.value).map(mapTableFromApi).filter((table) => table.id !== 't')
            : [];
          const apiOrders = ordersResult.status === 'fulfilled'
            ? normalizeArray(ordersResult.value).map(mapOrderFromApi).filter((order) => order.id !== 'o')
            : [];

          // Update with whatever we successfully fetched (partial updates are OK)
          set({
            menuItems: apiMenuItems.length > 0 ? apiMenuItems : get().menuItems,
            tables: apiTables.length > 0 ? apiTables : get().tables,
            orders: apiOrders.length > 0 ? apiOrders : get().orders,
          });

          // Log individual failures for debugging
          if (menuResult.status === 'rejected') console.warn('[Store] Menu load failed:', menuResult.reason?.message);
          if (tablesResult.status === 'rejected') console.warn('[Store] Tables load failed:', tablesResult.reason?.message);
          if (ordersResult.status === 'rejected') console.warn('[Store] Orders load failed:', ordersResult.reason?.message);
        } catch (error) {
          if (isAuthError(error)) {
            return;
          }
          console.warn('Failed to load initial restaurant data:', (error as any)?.message);
        }
      },

      refreshOrdersFromApi: async () => {
        try {
          const ordersRaw = await OrderService.getOrders();
          const orders = normalizeArray(ordersRaw).map(mapOrderFromApi).filter((order) => order.id !== 'o');
          set({ orders });
        } catch (error) {
          if (isAuthError(error)) {
            return;
          }
          if (isNetworkLikeError(error)) {
            warnOfflineOnce('orders sync paused', error);
            return;
          }
          console.error('Failed to refresh orders from API:', error);
        }
      },

      refreshTablesFromApi: async () => {
        try {
          const tablesRaw = await TableService.getTables();
          const tables = normalizeArray(tablesRaw).map(mapTableFromApi).filter((table) => table.id !== 't');
          set({ tables });
        } catch (error) {
          if (isAuthError(error)) {
            return;
          }
          if (isNetworkLikeError(error)) {
            warnOfflineOnce('tables sync paused', error);
            return;
          }
          console.error('Failed to refresh tables from API:', error);
        }
      },

      refreshMenuFromApi: async () => {
        try {
          const menuRaw = await MenuService.getMenuItems();
          const menuItems = normalizeArray(menuRaw).map(mapMenuItemFromApi).filter((item) => item.id !== 'm');
          set({ menuItems });
        } catch (error) {
          if (isAuthError(error)) {
            return;
          }
          if (isNetworkLikeError(error)) {
            warnOfflineOnce('menu sync paused', error);
            return;
          }
          console.error('Failed to refresh menu from API:', error);
        }
      },

      submitOrderToKitchen: async (tableId, _waiterName, customerPhone) => {
        const { cart } = get();
        if (cart.length === 0) return null;

        let created: any = null;
        try {
          created = await OrderService.createOrder({
            tableId: toNumber(tableId),
            orderType: 'dine_in',
            customerPhone: customerPhone?.trim() || undefined,
            items: cart.map((item) => ({
              menuItemId: toNumber(item.itemId),
              quantity: item.quantity,
              customizations: {
                ...(item.specialInstructions ? { notes: item.specialInstructions } : {}),
                ...(item.spiceLevel ? { spiceLevel: item.spiceLevel } : {}),
                ...(item.dietPreference ? { dietPreference: item.dietPreference } : {}),
              },
            })),
          });
        } catch (error) {
          console.warn('Failed to create order via API:', (error as any)?.message);
          return null;
        }

        if (!created) return null;
        const mappedOrder = mapOrderFromApi(created);

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

        // Try socket emit first, fallback to REST
        try {
          const numericId = toNumber(orderId);
          const socketSuccess = await socketService.emitOrderStatusUpdate(numericId, 'ready');
          
          if (!socketSuccess) {
            // Socket failed or not connected, use REST API
            console.log('Using REST API fallback for markOrderAsReady');
            await OrderService.updateOrderPut(String(numericId), { status: 'ready' });
          }
          
          // Refresh from server to ensure consistency
          await get().refreshOrdersFromApi();
          await get().refreshTablesFromApi();
        } catch (error) {
          console.warn('Failed to sync markOrderAsReady to backend:', (error as any)?.message);
          // Still refresh to get the server truth
          try { await get().refreshOrdersFromApi(); } catch (_) {}
        }
      },

      markOrderAsDelivered: async (orderId) => {
        const targetOrder = get().orders.find((o) => o.id === orderId);
        if (!targetOrder) return;

        // Optimistic local update
        set((state) => {
          const nextOrders = state.orders.map((o) =>
            o.id === orderId ? { ...o, status: 'served' as const, updatedAt: getCurrentTimestamp() } : o
          );

          const hasOtherReadyOrders = nextOrders.some(
            (o) => o.tableId === targetOrder.tableId && o.id !== orderId && o.status === 'ready'
          );

          return {
            orders: nextOrders,
            tables: state.tables.map((t) => {
              if (t.id !== targetOrder.tableId) return t;
              if (t.status === 'billing') return t;
              return { ...t, status: hasOtherReadyOrders ? t.status : 'occupied' as const };
            }),
          };
        });

        // Try socket emit first, fallback to REST
        try {
          const numericId = toNumber(orderId);
          const socketSuccess = await socketService.emitOrderStatusUpdate(numericId, 'served');

          if (!socketSuccess) {
            console.log('Using REST API fallback for markOrderAsDelivered');
            await OrderService.updateOrderPut(String(numericId), { status: 'served' });
          }

          await get().refreshOrdersFromApi();
          await get().refreshTablesFromApi();
        } catch (error) {
          console.warn('Failed to sync markOrderAsDelivered to backend:', (error as any)?.message);
          try {
            await get().refreshOrdersFromApi();
            await get().refreshTablesFromApi();
          } catch (_) {}
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
          await OrderService.updateOrder(numericId, { status: 'billing' });
          await get().refreshOrdersFromApi();
          await get().refreshTablesFromApi();
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

// Setup reconnection handler to refresh data after socket reconnects
socketService.onReconnect(() => {
  console.log('Socket reconnected - refreshing data');
  const store = useRestaurantStore.getState();
  Promise.all([
    store.refreshOrdersFromApi(),
    store.refreshTablesFromApi(),
    store.refreshMenuFromApi(),
  ]).catch(error => {
    console.error('Error refreshing data on reconnect:', error);
  });
});
