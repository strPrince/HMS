import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
export const STORAGE_KEYS = {
  AUTH: '@auth',
  MENU_ITEMS: '@menuItems',
  TABLES: '@tables',
  ORDERS: '@orders',
};

// Generic storage methods
export const storage = {
  set: async <T>(key: string, value: T): Promise<void> => {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('Storage set error:', error);
    }
  },

  get: async <T>(key: string): Promise<T | null> => {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) as T : null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },

  remove: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  },

  clear: async (): Promise<void> => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  },
};

// Specific storage methods
export const authStorage = {
  setUser: async (user: any) => storage.set(STORAGE_KEYS.AUTH, user),
  getUser: async () => storage.get(STORAGE_KEYS.AUTH),
  removeUser: async () => storage.remove(STORAGE_KEYS.AUTH),
};

export const menuStorage = {
  setMenuItems: async (items: any[]) => storage.set(STORAGE_KEYS.MENU_ITEMS, items),
  getMenuItems: async () => storage.get(STORAGE_KEYS.MENU_ITEMS),
};

export const tableStorage = {
  setTables: async (tables: any[]) => storage.set(STORAGE_KEYS.TABLES, tables),
  getTables: async () => storage.get(STORAGE_KEYS.TABLES),
};

export const orderStorage = {
  setOrders: async (orders: any[]) => storage.set(STORAGE_KEYS.ORDERS, orders),
  getOrders: async () => storage.get(STORAGE_KEYS.ORDERS),
};
