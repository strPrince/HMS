/**
 * Offline Action Queue
 *
 * Queues failed mutations (order create, status updates) when the device
 * is offline, and replays them automatically when connectivity returns.
 *
 * Uses AsyncStorage for persistence so the queue survives app restarts.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OrderService from '../src/services/order.service';

const STORAGE_KEY = '@hms/offline-queue';

export type QueuedAction = {
    id: string;
    type: 'create_order' | 'update_order';
    payload: any;
    createdAt: string;
    retries: number;
};

type OfflineQueueState = {
    queue: QueuedAction[];
    isOnline: boolean;
    isFlushing: boolean;

    // Actions
    setOnline: (online: boolean) => void;
    enqueue: (action: Omit<QueuedAction, 'id' | 'createdAt' | 'retries'>) => void;
    flush: () => Promise<void>;
    loadQueue: () => Promise<void>;
    clearQueue: () => void;
};

const persistQueue = async (queue: QueuedAction[]) => {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
        console.error('[OfflineQueue] Failed to persist queue:', e);
    }
};

export const useOfflineQueue = create<OfflineQueueState>((set, get) => ({
    queue: [],
    isOnline: true,
    isFlushing: false,

    setOnline: (online) => {
        set({ isOnline: online });
        if (online) {
            get().flush();
        }
    },

    enqueue: (action) => {
        const entry: QueuedAction = {
            ...action,
            id: `q${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            createdAt: new Date().toISOString(),
            retries: 0,
        };
        const newQueue = [...get().queue, entry];
        set({ queue: newQueue });
        persistQueue(newQueue);
    },

    flush: async () => {
        const { queue, isFlushing, isOnline } = get();
        if (isFlushing || !isOnline || queue.length === 0) return;

        set({ isFlushing: true });
        const remaining: QueuedAction[] = [];

        for (const action of queue) {
            try {
                if (action.type === 'create_order') {
                    await OrderService.createOrder(action.payload);
                } else if (action.type === 'update_order') {
                    await OrderService.updateOrder(action.payload.orderId, action.payload.data);
                }
                // Success — don't keep in queue
            } catch (error) {
                console.warn('[OfflineQueue] Retry failed for', action.id, error);
                if (action.retries < 5) {
                    remaining.push({ ...action, retries: action.retries + 1 });
                } else {
                    console.error('[OfflineQueue] Dropped after 5 retries:', action.id);
                }
            }
        }

        set({ queue: remaining, isFlushing: false });
        persistQueue(remaining);
    },

    loadQueue: async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as QueuedAction[];
                set({ queue: parsed });
            }
        } catch (e) {
            console.error('[OfflineQueue] Failed to load queue:', e);
        }
    },

    clearQueue: () => {
        set({ queue: [] });
        AsyncStorage.removeItem(STORAGE_KEY).catch(() => { });
    },
}));
