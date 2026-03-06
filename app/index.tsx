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

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading spinner while checking authentication OR before client mount
  if (isLoading || !mounted) {
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
        : user.role === 'manager'
          ? '/(tabs)/manager'
          : '/(tabs)/tables';
    return <Redirect href={target} />;
  }

  // If not authenticated, redirect to phone login
  return <Redirect href="/phone-login" />;
}
