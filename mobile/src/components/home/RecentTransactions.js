import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency } from '../../utils/formatters';
import Card from '../ui/Card';
import SectionHeader from '../ui/SectionHeader';
import LoadingIndicator from '../ui/LoadingIndicator';
import EmptyState from '../ui/EmptyState';

function TransactionRow({ tx }) {
  const { theme } = useTheme();
  const isIncome = tx.type === 'income';

  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: theme.border + '60',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
        <View style={{
          width: 44, height: 44, borderRadius: 12,
          justifyContent: 'center', alignItems: 'center',
          backgroundColor: isIncome ? theme.success + '10' : theme.error + '10',
        }}>
          <Text style={{ fontSize: 20 }}>{tx.categoryId?.icon || '💰'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '500', marginBottom: 2, color: theme.text }} numberOfLines={1}>
            {tx.description || tx.categoryId?.name || 'Giao dịch'}
          </Text>
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
            {tx.categoryId?.name || ''}
          </Text>
        </View>
      </View>
      <Text style={{ fontSize: 15, fontWeight: '600', color: isIncome ? theme.success : theme.error }}>
        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
      </Text>
    </View>
  );
}

export default function RecentTransactions({ transactions, loading }) {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <>
      <SectionHeader
        title="Gần đây"
        actionLabel="Xem tất cả"
        onAction={() => router.push('/transactions')}
      />
      <View style={{ paddingHorizontal: 20 }}>
        {loading ? (
          <LoadingIndicator />
        ) : transactions.length === 0 ? (
          <EmptyState message="Chưa có giao dịch nào" />
        ) : (
          transactions.slice(0, 5).map((tx) => (
            <TransactionRow key={tx._id} tx={tx} />
          ))
        )}
      </View>
    </>
  );
}
