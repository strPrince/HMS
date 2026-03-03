import { Tabs } from 'expo-router';
import { Home, Table2, Utensils, Settings, ChefHat } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useAuth } from '../../providers/AuthProvider';

export default function TabsLayout() {
  const { user } = useAuth();
  const role = user?.role;
  const isKitchen = role === 'kitchen';
  const isManager = role === 'manager';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600'
        }
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          href: isManager ? undefined : null,
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tables"
        options={{
          title: 'Tables',
          href: isKitchen ? null : undefined,
          tabBarIcon: ({ color, size }) => <Table2 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          href: isKitchen ? null : undefined,
          tabBarIcon: ({ color, size }) => <Utensils size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="kitchen"
        options={{
          title: 'Kitchen',
          href: isKitchen ? undefined : null,
          tabBarIcon: ({ color, size }) => <ChefHat size={size} color={color} />,
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
