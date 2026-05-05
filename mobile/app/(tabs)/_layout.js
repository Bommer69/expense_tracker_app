import { Tabs } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { Text, StyleSheet } from 'react-native';

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
        },
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTintColor: theme.text,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color }) => <Text style={[styles.icon, { color }]}>🏠</Text>,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Giao dịch',
          tabBarIcon: ({ color }) => <Text style={[styles.icon, { color }]}>💳</Text>,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Ngân sách',
          tabBarIcon: ({ color }) => <Text style={[styles.icon, { color }]}>🎯</Text>,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Hồ sơ',
          tabBarIcon: ({ color }) => <Text style={[styles.icon, { color }]}>👤</Text>,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 20,
  },
});