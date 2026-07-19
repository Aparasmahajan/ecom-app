import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import WishlistScreen from '../screens/WishlistScreen';
import CartScreen from '../screens/CartScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { colors } from '../theme';
import { useApp } from '../state/store';

const Tab = createBottomTabNavigator();

function TabIcon({ char, focused, badge }: { char: string; focused: boolean; badge?: number }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 20, color: focused ? colors.accent : colors.muted }}>{char}</Text>
      {typeof badge === 'number' && badge > 0 && (
        <View style={{
          position: 'absolute', top: -4, right: -12,
          backgroundColor: colors.accent, borderRadius: 999,
          minWidth: 16, paddingHorizontal: 4,
          alignItems: 'center', justifyContent: 'center'
        }}>
          <Text style={{ color: colors.black, fontSize: 9, fontWeight: '800' }}>{badge}</Text>
        </View>
      )}
    </View>
  );
}

export default function Tabs() {
  const cartCount = useApp(s => s.cartCount);
  const wishCount = useApp(s => s.wishCount);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.bg2,
          borderTopColor: colors.border,
          height: 68,
          paddingTop: 8,
          paddingBottom: 8
        },
        tabBarLabelStyle: { fontSize: 11 }
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon char="🏠" focused={focused} /> }}
      />
      <Tab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon char="📦" focused={focused} /> }}
      />
      <Tab.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon char="♡" focused={focused} badge={wishCount} /> }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon char="🛒" focused={focused} badge={cartCount} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon char="👤" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}
