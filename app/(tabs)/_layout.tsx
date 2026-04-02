import { Tabs } from 'expo-router';
import { Users, Utensils, Settings, ChefHat } from 'lucide-react-native';
import { useAuth } from '../../providers/AuthProvider';

export default function TabsLayout() {
  const { user } = useAuth();
  const role = user?.role;
  const isKitchen = role === 'cook';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600'
        }
      }}
    >
      <Tabs.Screen
        name="tables"
        options={{
          title: 'Tables',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
          href: isKitchen ? null : '/(tabs)/tables',
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <Utensils size={size} color={color} />,
          href: isKitchen ? null : '/(tabs)/orders',
        }}
      />
      <Tabs.Screen
        name="kitchen"
        options={{
          title: 'Kitchen',
          tabBarIcon: ({ color, size }) => <ChefHat size={size} color={color} />,
          href: isKitchen ? '/(tabs)/kitchen' : null,
        }}
      />
      <Tabs.Screen
        name="kitchenStyles"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
