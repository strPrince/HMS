/**
 * pin.tsx — This screen is part of the offline mock flow.
 * The app now uses phone+PIN login via AuthProvider. Redirect to login.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

export default function PinScreen() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, []);
  return <View />;
}
