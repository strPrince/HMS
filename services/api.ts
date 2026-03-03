import type { MenuItem, Order, Table } from '../types/restaurant';
import { menuItems, tables, orders } from '../mocks/restaurant-data';
import { generateId } from '../utils/helpers';

// Simulated API delay
const delay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Menu items service
export const menuService = {
  getMenuItems: async (): Promise<MenuItem[]> => {
    await delay();
    return [...menuItems];
  },

  getMenuItem: async (id: string): Promise<MenuItem | undefined> => {
    await delay();
    return menuItems.find(item => item.id === id);
  },

  createMenuItem: async (item: Omit<MenuItem, 'id'>): Promise<MenuItem> => {
    await delay();
    const newItem: MenuItem = {
      ...item,
      id: generateId('m'),
    };
    menuItems.push(newItem);
    return newItem;
  },

  updateMenuItem: async (id: string, updates: Partial<MenuItem>): Promise<MenuItem> => {
    await delay();
    const index = menuItems.findIndex(item => item.id === id);
    if (index !== -1) {
      menuItems[index] = { ...menuItems[index], ...updates };
      return menuItems[index];
    }
    throw new Error('MenuItem not found');
  },

  deleteMenuItem: async (id: string): Promise<void> => {
    await delay();
    const index = menuItems.findIndex(item => item.id === id);
    if (index !== -1) {
      menuItems.splice(index, 1);
    }
  },
};

// Tables service
export const tableService = {
  getTables: async (): Promise<Table[]> => {
    await delay();
    return [...tables];
  },

  getTable: async (id: string): Promise<Table | undefined> => {
    await delay();
    return tables.find(table => table.id === id);
  },

  createTable: async (table: Omit<Table, 'id'>): Promise<Table> => {
    await delay();
    const newTable: Table = {
      ...table,
      id: generateId('t'),
    };
    tables.push(newTable);
    return newTable;
  },

  updateTable: async (id: string, updates: Partial<Table>): Promise<Table> => {
    await delay();
    const index = tables.findIndex(table => table.id === id);
    if (index !== -1) {
      tables[index] = { ...tables[index], ...updates };
      return tables[index];
    }
    throw new Error('Table not found');
  },

  deleteTable: async (id: string): Promise<void> => {
    await delay();
    const index = tables.findIndex(table => table.id === id);
    if (index !== -1) {
      tables.splice(index, 1);
    }
  },
};

// Orders service
export const orderService = {
  getOrders: async (): Promise<Order[]> => {
    await delay();
    return [...orders];
  },

  getOrder: async (id: string): Promise<Order | undefined> => {
    await delay();
    return orders.find(order => order.id === id);
  },

  createOrder: async (order: Omit<Order, 'id' | 'createdAt'>): Promise<Order> => {
    await delay();
    const newOrder: Order = {
      ...order,
      id: generateId('o'),
      createdAt: new Date().toISOString(),
    };
    orders.push(newOrder);
    return newOrder;
  },

  updateOrder: async (id: string, updates: Partial<Order>): Promise<Order> => {
    await delay();
    const index = orders.findIndex(order => order.id === id);
    if (index !== -1) {
      orders[index] = { ...orders[index], ...updates };
      return orders[index];
    }
    throw new Error('Order not found');
  },

  deleteOrder: async (id: string): Promise<void> => {
    await delay();
    const index = orders.findIndex(order => order.id === id);
    if (index !== -1) {
      orders.splice(index, 1);
    }
  },
};
