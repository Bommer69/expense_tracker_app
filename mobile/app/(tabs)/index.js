import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../src/hooks/useTheme';

export default function HomeScreen() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <Text style={styles.headerTitle}>💰 Quản lý Chi tiêu</Text>
        </View>

        <View style={styles.balanceContainer}>
          <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>
            Số dư tổng cộng
          </Text>
          <Text style={[styles.balanceAmount, { color: theme.text }]}>
            10,000,000 ₫
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: theme.success + '20' }]}>
            <Text style={styles.summaryIcon}>📈</Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              Thu nhập
            </Text>
            <Text style={[styles.summaryAmount, { color: theme.success }]}>
              +15,000,000 ₫
            </Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: theme.error + '20' }]}>
            <Text style={styles.summaryIcon}>📉</Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              Chi tiêu
            </Text>
            <Text style={[styles.summaryAmount, { color: theme.error }]}>
              -5,000,000 ₫
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Thao tác nhanh
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.actionIcon}>💳</Text>
            <Text style={styles.actionText}>Giao dịch</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.warning }]}
          >
            <Text style={styles.actionIcon}>🎯</Text>
            <Text style={styles.actionText}>Ngân sách</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
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
  balanceContainer: {
    alignItems: 'center',
    marginTop: -20,
    marginHorizontal: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
  },
  summaryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
    marginHorizontal: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});