import React, { useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, AppState, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { useOfflineQueue } from '../store/useOfflineQueue';
import { colors } from '../constants/colors';

/**
 * Lightweight connectivity monitor.
 *
 * Uses `navigator.onLine` (web) and a periodic fetch-based ping (native)
 * so we don't need `@react-native-community/netinfo`.
 * Shows an orange banner when offline.
 */
export default function OfflineBanner() {
    const isOnline = useOfflineQueue((s) => s.isOnline);
    const queueLength = useOfflineQueue((s) => s.queue.length);
    const setOnline = useOfflineQueue((s) => s.setOnline);
    const loadQueue = useOfflineQueue((s) => s.loadQueue);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const checkConnectivity = useCallback(async () => {
        if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
            setOnline(navigator.onLine);
            return;
        }

        // For native, do a lightweight HEAD request
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            await fetch('https://clients3.google.com/generate_204', {
                method: 'HEAD',
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            setOnline(true);
        } catch {
            setOnline(false);
        }
    }, [setOnline]);

    useEffect(() => {
        loadQueue();
        checkConnectivity();

        // Check every 15 seconds
        intervalRef.current = setInterval(checkConnectivity, 15000);

        // Listen for web online/offline events
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            const goOnline = () => setOnline(true);
            const goOffline = () => setOnline(false);
            window.addEventListener('online', goOnline);
            window.addEventListener('offline', goOffline);
            return () => {
                if (intervalRef.current) clearInterval(intervalRef.current);
                window.removeEventListener('online', goOnline);
                window.removeEventListener('offline', goOffline);
            };
        }

        // Listen for app state changes (native)
        const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
            if (state === 'active') {
                checkConnectivity();
            }
        });

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            sub.remove();
        };
    }, [checkConnectivity, loadQueue, setOnline]);

    if (isOnline && queueLength === 0) return null;

    return (
        <View style={[styles.banner, isOnline ? styles.bannerSyncing : styles.bannerOffline]}>
            <Text style={styles.bannerText}>
                {!isOnline
                    ? '📡 You are offline — actions will be queued'
                    : `⏳ Syncing ${queueLength} queued action${queueLength !== 1 ? 's' : ''}…`}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    bannerOffline: {
        backgroundColor: colors.danger,
    },
    bannerSyncing: {
        backgroundColor: colors.warning,
    },
    bannerText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },
});
