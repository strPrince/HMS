import { useCallback, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../providers/AuthProvider';
import OfflineBanner from '../components/OfflineBanner';
import AnimatedSplash from '../components/AnimatedSplash';
import { ToastContainer } from '../src/components/common/ToastContainer';

SplashScreen.preventAutoHideAsync().catch(() => {
  // No-op: preventAutoHideAsync can throw if called more than once in dev.
});

export default function RootLayout() {
  // OfflineBanner uses AsyncStorage which is not available during SSR.
  // Only mount it once we're on the client.
  const [clientReady, setClientReady] = useState(false);
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);
  // Stable reference so AnimatedSplash animation is never interrupted by re-renders
  const handleSplashFinish = useCallback(() => setShowAnimatedSplash(false), []);

  useEffect(() => {
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (!clientReady) return;

    SplashScreen.hideAsync().catch(() => {
      // Ignore hide errors in non-native/web contexts.
    });
  }, [clientReady]);

  // Failsafe: never allow splash overlay to block the app for too long.
  useEffect(() => {
    if (!showAnimatedSplash) return;

    const timer = setTimeout(() => {
      setShowAnimatedSplash(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, [showAnimatedSplash]);

  return (
    <AuthProvider>
      {clientReady && <OfflineBanner />}
      {clientReady && <ToastContainer />}
      <Stack
        screenOptions={{ headerShown: false }}
        initialRouteName="index"
      />
      {showAnimatedSplash && (
        <AnimatedSplash onFinish={handleSplashFinish} />
      )}
    </AuthProvider>
  );
}
