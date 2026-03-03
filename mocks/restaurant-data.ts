import type { MenuItem, Order, Table } from '../types/restaurant';

export const menuItems: MenuItem[] = [
  {
    id: 'm1',
    name: 'Paneer Tikka',
    price: 320,
    category: 'Starters',
    description: 'Marinated cottage cheese grilled in tandoor.',
    isPopular: true
  },
  {
    id: 'm2',
    name: 'Chicken 65',
    price: 350,
    category: 'Starters',
    description: 'Spicy deep-fried chicken with curry leaves.',
    isPopular: true
  },
  {
    id: 'm3',
    name: 'Veg Spring Rolls',
    price: 240,
    category: 'Starters',
    description: 'Crispy rolls stuffed with mixed vegetables.',
    isPopular: true
  },
  {
    id: 'm4',
    name: 'Mutton Seekh Kebab',
    price: 420,
    category: 'Starters',
    description: 'Minced mutton skewers with aromatic spices.',
    isPopular: true
  },
  {
    id: 'm5',
    name: 'Fish Amritsari',
    price: 380,
    category: 'Seafood',
    description: 'Batter-fried fish with ajwain and spices.',
    isPopular: true
  },
  {
    id: 'm6',
    name: 'Butter Chicken',
    price: 410,
    category: 'Main Course',
    description: 'Creamy tomato gravy with tender chicken.'
  },
  {
    id: 'm7',
    name: 'Butter Naan',
    price: 60,
    category: 'Breads',
    description: 'Soft, buttery naan baked in tandoor.'
  }
];

export const tables: Table[] = [
  { id: 't1', label: '1', seats: 4, status: 'free' },
  { id: 't2', label: '2', seats: 2, status: 'free' },
  { id: 't3', label: '3', seats: 4, status: 'ready', guests: 4, elapsedMinutes: 857 },
  { id: 't4', label: '4', seats: 2, status: 'free' },
  { id: 't5', label: '5', seats: 4, status: 'free' },
  { id: 't6', label: '6', seats: 6, status: 'ready', guests: 6, elapsedMinutes: 826 },
  { id: 't7', label: '7', seats: 4, status: 'free' },
  { id: 't8', label: '8', seats: 4, status: 'occupied', guests: 4, elapsedMinutes: 736 }
];

export const orders: Order[] = [
  {
    id: 'o1008',
    tableId: 't8',
    items: [
      { itemId: 'm1', quantity: 2, status: 'new' }
    ],
    status: 'open',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'o1006',
    tableId: 't6',
    items: [
      { itemId: 'm5', quantity: 1, status: 'ready' },
      { itemId: 'm4', quantity: 2, status: 'ready' },
      { itemId: 'm3', quantity: 1, status: 'ready' }
    ],
    status: 'ready',
    createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'o1003',
    tableId: 't3',
    items: [
      { itemId: 'm1', quantity: 1, status: 'ready' },
      { itemId: 'm6', quantity: 1, status: 'ready' },
      { itemId: 'm7', quantity: 3, status: 'ready' }
    ],
    status: 'ready',
    createdAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
    notes: 'Less spicy'
  },
  {
    id: 'o1001',
    tableId: 't2',
    items: [
      { itemId: 'm2', quantity: 1, status: 'ready' },
      { itemId: 'm7', quantity: 2, status: 'ready' }
    ],
    status: 'closed',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];
