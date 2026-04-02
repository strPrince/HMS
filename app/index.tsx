import { Redirect } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '../constants/colors';
import { useEffect, useState } from 'react';

export default function Index() {
  const { user, isLoading } = useAuth();
  // Mounted guard: Redirect only works on the client after the first render.
  // During SSR (or before hydration) we show a lightweight placeholder.
  const [mounted, setMounted] = useState(false);
  const [loadingWatchdogElapsed, setLoadingWatchdogElapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setLoadingWatchdogElapsed(false);
      return;
    }

    const timer = setTimeout(() => {
      setLoadingWatchdogElapsed(true);
    }, 6000);

    return () => clearTimeout(timer);
  }, [isLoading]);

  // Show loading spinner while checking authentication OR before client mount
  if ((isLoading && !loadingWatchdogElapsed) || !mounted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // If user is authenticated, redirect to appropriate tab based on role
  if (user) {
    const target =
      user.role === 'cook'
        ? '/(tabs)/kitchen'
        : '/(tabs)/tables';
    return <Redirect href={target} />;
  }

  // If not authenticated, redirect to phone login
  return <Redirect href="/phone-login" />;
}
