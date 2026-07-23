import { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import Tabs from './src/navigation/Tabs';
import ProductsScreen from './src/screens/ProductsScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import AuthScreen from './src/screens/AuthScreen';
import AddressesScreen from './src/screens/AddressesScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import AdminOrders from './src/screens/admin/AdminOrders';
import AdminProducts from './src/screens/admin/AdminProducts';
import AdminInventory from './src/screens/admin/AdminInventory';
import AdminListing from './src/screens/admin/AdminListing';
import AdminCombos from './src/screens/admin/AdminCombos';
import AdminBanners from './src/screens/admin/AdminBanners';
import AdminAdmins from './src/screens/admin/AdminAdmins';

import { useApp } from './src/state/store';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
    notification: colors.accent
  }
};

export default function App() {
  const ready = useApp(s => s.ready);
  const init = useApp(s => s.init);

  useEffect(() => { init(); }, [init]);

  if (!ready) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <NavigationContainer theme={navTheme}>
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerTitleStyle: { fontWeight: '800' },
              contentStyle: { backgroundColor: colors.bg }
            }}
          >
            <Stack.Screen name="Root" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen name="Products" component={ProductsScreen} options={{ title: 'Shop' }} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: '' }} />
            <Stack.Screen name="Auth" component={AuthScreen} options={{ title: 'Sign In' }} />
            <Stack.Screen name="Addresses" component={AddressesScreen} options={{ title: 'Addresses' }} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
            <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'My Orders' }} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order' }} />
            <Stack.Screen name="AdminOrders" component={AdminOrders} options={{ title: 'Orders · Admin' }} />
            <Stack.Screen name="AdminProducts" component={AdminProducts} options={{ title: 'Products · Admin' }} />
            <Stack.Screen name="AdminInventory" component={AdminInventory} options={{ title: 'Inventory · Admin' }} />
            <Stack.Screen name="AdminListing" component={AdminListing} options={{ title: 'Listing · Admin' }} />
            <Stack.Screen name="AdminCombos" component={AdminCombos} options={{ title: 'Combos · Admin' }} />
            <Stack.Screen name="AdminBanners" component={AdminBanners} options={{ title: 'Banners · Admin' }} />
            <Stack.Screen name="AdminAdmins" component={AdminAdmins} options={{ title: 'Admins · Admin' }} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }
});
