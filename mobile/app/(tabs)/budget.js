import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../src/hooks/useTheme';

export default function BudgetScreen() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>🎯 Ngân sách</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.placeholder, { color: theme.textSecondary }]}>
          Quản lý ngân sách sẽ hiển thị ở đây
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  placeholder: {
    fontSize: 16,
    textAlign: 'center',
  },
});