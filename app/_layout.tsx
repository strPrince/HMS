import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../providers/AuthProvider';
import OfflineBanner from '../components/OfflineBanner';
import AnimatedSplash from '../components/AnimatedSplash';

SplashScreen.preventAutoHideAsync().catch(() => {
  // No-op: preventAutoHideAsync can throw if called more than once in dev.
});

export default function RootLayout() {
  // OfflineBanner uses AsyncStorage which is not available during SSR.
  // Only mount it once we're on the client.
  const [clientReady, setClientReady] = useState(false);
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  useEffect(() => {
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (!clientReady) return;

    SplashScreen.hideAsync().catch(() => {
      // Ignore hide errors in non-native/web contexts.
    });
  }, [clientReady]);

  return (
    <AuthProvider>
      {clientReady && <OfflineBanner />}
      <Stack
        screenOptions={{ headerShown: false }}
        initialRouteName="index"
      />
      {showAnimatedSplash && (
        <AnimatedSplash onFinish={() => setShowAnimatedSplash(false)} />
      )}
    </AuthProvider>
  );
}
