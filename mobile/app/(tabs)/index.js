import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAccounts } from '../../src/hooks/useAccounts';
import { useTransactions, useTransactionSummary } from '../../src/hooks/useTransactions';
import { formatCurrency, getMonthName, getCurrentMonth } from '../../src/utils/formatters';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../src/hooks/useAuth';
import { UserGuideModal } from '../../src/components/UserGuideModal';
import { homeStyles as styles } from '../../src/styles/homeStyles';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { accounts, loading: aL, fetchAccounts, getBalance } = useAccounts();
  const { transactions, loading: tL, fetchTransactions } = useTransactions(5);
  const { summary, loading: sL, fetchSummary } = useTransactionSummary();
  const [refreshing, setRefreshing] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);
  const [balanceAccounts, setBalanceAccounts] = useState([]);

  // Sử dụng số dư tính từ giao dịch (thay vì balance tĩnh từ DB)
  const totalBalance = balanceAccounts.reduce((sum, acc) => sum + (acc.calculatedBalance || 0), 0);
  const loading = aL || tL || sL;

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
      fetchAccounts();
      fetchSummary();
    }, [fetchTransactions, fetchAccounts, fetchSummary])
  );

  // Khi accounts thay đổi, lấy số dư thực tế
  useEffect(() => {
    if (accounts.length > 0) {
      getBalance()
        .then(data => setBalanceAccounts(data || []))
        .catch(() => setBalanceAccounts(accounts)); // fallback về accounts gốc
    } else {
      setBalanceAccounts([]);
    }
  }, [accounts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAccounts(), fetchTransactions(), fetchSummary()]);
    setRefreshing(false);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Minimal Header */}
      <View style={[styles.header, { borderBottomColor: theme.border + '40' }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>{greeting()}</Text>
            <Text style={[styles.userName, { color: theme.text }]}>{user?.name || 'Bạn'}</Text>
          </View>
          <TouchableOpacity onPress={() => setGuideVisible(true)} style={styles.infoBtn}>
            <Ionicons name="book-outline" size={24} color="#6B7194" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}>
        
        {/* Minimal Balance Card */}
        <View style={[styles.balanceCard, { backgroundColor: theme.surface, borderColor: theme.border + '60' }]}>
          {loading && !refreshing ? <ActivityIndicator color={theme.primary} /> : (
            <>
              <View style={styles.balanceHead}>
                <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Tổng số dư</Text>
                <Text style={[styles.monthBadge, { color: theme.textSecondary, backgroundColor: theme.border + '50' }]}>{getMonthName(getCurrentMonth())}</Text>
              </View>
              <Text style={[styles.balanceAmount, { color: theme.text }]}>{formatCurrency(totalBalance)}</Text>
              <View style={styles.balanceRow}>
                <View style={styles.balanceMini}>
                  <Text style={[styles.balanceMiniLabel, { color: theme.textSecondary }]}>Thu nhập</Text>
                  <Text style={[styles.balanceMiniAmount, { color: theme.success }]}>+{formatCurrency(summary.totalIncome || 0)}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <View style={styles.balanceMini}>
                  <Text style={[styles.balanceMiniLabel, { color: theme.textSecondary }]}>Chi tiêu</Text>
                  <Text style={[styles.balanceMiniAmount, { color: theme.error }]}>-{formatCurrency(summary.totalExpense || 0)}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {[
            { iconName: 'card-outline', label: 'Chi tiêu', route: '/transactions' },
            { iconName: 'wallet-outline', label: 'Thu nhập', route: '/transactions' },
            { iconName: 'chatbubbles', label: 'AI Chat', route: '/ai-chat' },
            { iconName: 'pie-chart-outline', label: 'Ngân sách', route: '/budget' },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={[styles.quickBtn, { backgroundColor: theme.surface, borderColor: theme.border + '50' }]} onPress={() => router.push(item.route)}>
              <Ionicons name={item.iconName} size={20} color={theme.primary} style={styles.quickIcon} />
              <Text style={[styles.quickLabel, { color: theme.text }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Transactions */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Gần đây</Text>
          <TouchableOpacity onPress={() => router.push('/transactions')}>
            <Text style={[styles.seeAll, { color: theme.primary }]}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.txList}>
          {loading && !refreshing ? <ActivityIndicator style={{ padding: 24 }} color={theme.primary} /> :
            transactions.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Chưa có giao dịch nào</Text>
            ) : transactions.slice(0, 5).map((tx, idx) => (
              <View key={tx._id} style={[styles.txItem, { borderBottomColor: theme.border + '60' }]}>
                <View style={styles.txLeft}>
                  <View style={[styles.txIconBg, { backgroundColor: tx.type === 'income' ? theme.success + '10' : theme.error + '10' }]}>
                    <Text style={styles.txIcon}>{tx.categoryId?.icon || '💰'}</Text>
                  </View>
                  <View>
                    <Text style={[styles.txDesc, { color: theme.text }]}>{tx.description || tx.categoryId?.name || 'Giao dịch'}</Text>
                    <Text style={[styles.txCat, { color: theme.textSecondary }]}>{tx.categoryId?.name || ''}</Text>
                  </View>
                </View>
                <Text style={[styles.txAmount, { color: tx.type === 'income' ? theme.success : theme.error }]}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </Text>
              </View>
            ))
          }
        </View>

        {/* Accounts */}
        <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: theme.text }]}>Tài khoản</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsScroll}>
          {balanceAccounts.map(acc => (
            <View key={acc._id} style={[styles.accountCard, { backgroundColor: theme.surface, borderColor: theme.border + '50' }]}>
              <View style={styles.accTop}>
                <Ionicons name={acc.type === 'cash' ? 'cash-outline' : acc.type === 'bank' ? 'business-outline' : 'phone-portrait-outline'} size={20} color={theme.primary} />
                <Text style={[styles.accName, { color: theme.textSecondary }]}>{acc.name}</Text>
              </View>
              <Text style={[styles.accBalance, { color: theme.text }]}>{formatCurrency(acc.calculatedBalance || 0)}</Text>
            </View>
          ))}
          {/* Spacer for right margin */}
          <View style={{ width: 20 }} />
        </ScrollView>
      </ScrollView>

      <UserGuideModal
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
        title="Hướng dẫn Tổng quan"
        guideItems={[
          { iconName: 'wallet', title: 'Số dư tổng', desc: 'Hiển thị tổng tài sản hiện tại của bạn trong tất cả các tài khoản.' },
          { iconName: 'flash', title: 'Phím tắt', desc: 'Truy cập nhanh vào chức năng thêm thu/chi, trò chuyện với AI, và ngân sách.' },
          { iconName: 'document-text', title: 'Gần đây', desc: 'Danh sách 5 giao dịch mới nhất bạn vừa thực hiện.' }
        ]}
      />
    </View>
  );
}

