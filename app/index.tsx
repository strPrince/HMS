import { Redirect } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';

export default function Index() {
  const { user } = useAuth();

  if (user) {
    const target =
      user.role === 'manager'
        ? '/(tabs)/dashboard'
        : user.role === 'kitchen'
        ? '/(tabs)/kitchen'
        : '/(tabs)/tables';
    return <Redirect href={target} />;
  }

  return <Redirect href="/profile-select" />;
}
