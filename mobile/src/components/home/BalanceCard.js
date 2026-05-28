import { View, Text, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency, getMonthName, getCurrentMonth } from '../../utils/formatters';
import Card from '../ui/Card';

export default function BalanceCard({ totalBalance, summary, loading }) {
  const { theme } = useTheme();

  return (
    <Card style={{ margin: 20 }}>
      {loading ? (
        <ActivityIndicator color={theme.primary} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary }}>Tổng số dư</Text>
            <Text style={{
              paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
              fontSize: 11, fontWeight: '600', overflow: 'hidden',
              color: theme.textSecondary, backgroundColor: theme.border + '50'
            }}>
              {getMonthName(getCurrentMonth())}
            </Text>
          </View>
          <Text style={{
            fontSize: 36, fontWeight: '800', marginBottom: 20,
            letterSpacing: -1, color: theme.text
          }}>
            {formatCurrency(totalBalance)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, marginBottom: 4, color: theme.textSecondary }}>Thu nhập</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.success }}>
                +{formatCurrency(summary.totalIncome || 0)}
              </Text>
            </View>
            <View style={{ width: 1, height: 24, marginHorizontal: 16, backgroundColor: theme.border }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, marginBottom: 4, color: theme.textSecondary }}>Chi tiêu</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.error }}>
                -{formatCurrency(summary.totalExpense || 0)}
              </Text>
            </View>
          </View>
        </>
      )}
    </Card>
  );
}
