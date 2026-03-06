import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../providers/AuthProvider';
import OfflineBanner from '../components/OfflineBanner';

export default function RootLayout() {
  // OfflineBanner uses AsyncStorage which is not available during SSR.
  // Only mount it once we're on the client.
  const [clientReady, setClientReady] = useState(false);
  useEffect(() => { setClientReady(true); }, []);

  return (
    <AuthProvider>
      {clientReady && <OfflineBanner />}
      <Stack
        screenOptions={{ headerShown: false }}
        initialRouteName="index"
      />
    </AuthProvider>
  );
}
