import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAccounts } from '../../src/hooks/useAccounts';
import { useTransactions, useTransactionSummary } from '../../src/hooks/useTransactions';
import { formatCurrency, getMonthName, getCurrentMonth } from '../../src/utils/formatters';
import { useState, useEffect } from 'react';
import { useAuth } from '../../src/hooks/useAuth';
import { UserGuideModal } from '../../src/components/UserGuideModal';

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { accounts, loading: aL, fetchAccounts } = useAccounts();
  const { transactions, loading: tL, fetchTransactions } = useTransactions(5);
  const { summary, loading: sL, fetchSummary } = useTransactionSummary();
  const [refreshing, setRefreshing] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const loading = aL || tL || sL;

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
            <Text style={{ fontSize: 22 }}>ℹ️</Text>
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
            { icon: '💸', label: 'Chi tiêu', route: '/transactions' },
            { icon: '💰', label: 'Thu nhập', route: '/transactions' },
            { icon: '🤖', label: 'AI Chat', route: '/ai-chat' },
            { icon: '🎯', label: 'Ngân sách', route: '/budget' },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={[styles.quickBtn, { backgroundColor: theme.surface, borderColor: theme.border + '50' }]} onPress={() => router.push(item.route)}>
              <Text style={styles.quickIcon}>{item.icon}</Text>
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
          {accounts.map(acc => (
            <View key={acc._id} style={[styles.accountCard, { backgroundColor: theme.surface, borderColor: theme.border + '50' }]}>
              <View style={styles.accTop}>
                <Text style={styles.accIcon}>{acc.type === 'cash' ? '💵' : acc.type === 'bank' ? '🏦' : '📱'}</Text>
                <Text style={[styles.accName, { color: theme.textSecondary }]}>{acc.name}</Text>
              </View>
              <Text style={[styles.accBalance, { color: theme.text }]}>{formatCurrency(acc.balance || 0)}</Text>
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
          { icon: '💎', title: 'Số dư tổng', desc: 'Hiển thị tổng tài sản hiện tại của bạn trong tất cả các tài khoản.' },
          { icon: '⚡', title: 'Phím tắt', desc: 'Truy cập nhanh vào chức năng thêm thu/chi, trò chuyện với AI, và ngân sách.' },
          { icon: '📝', title: 'Gần đây', desc: 'Danh sách 5 giao dịch mới nhất bạn vừa thực hiện.' }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 0.5 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 13, marginBottom: 2, fontWeight: '500' },
  userName: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  infoBtn: { padding: 4 },
  scrollContent: { paddingBottom: 100 },
  balanceCard: { margin: 20, borderRadius: 20, padding: 20, borderWidth: 1 },
  balanceHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  balanceLabel: { fontSize: 13, fontWeight: '600' },
  monthBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 11, fontWeight: '600', overflow: 'hidden' },
  balanceAmount: { fontSize: 36, fontWeight: '800', marginBottom: 20, letterSpacing: -1 },
  balanceRow: { flexDirection: 'row', alignItems: 'center' },
  balanceMini: { flex: 1 },
  divider: { width: 1, height: 24, marginHorizontal: 16 },
  balanceMiniLabel: { fontSize: 12, marginBottom: 4 },
  balanceMiniAmount: { fontSize: 15, fontWeight: '700' },
  quickActions: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 10 },
  quickBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 16, borderWidth: 1 },
  quickIcon: { fontSize: 22, marginBottom: 8 },
  quickLabel: { fontSize: 12, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 24, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '600' },
  txList: { paddingHorizontal: 20 },
  txItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 0.5 },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  txIconBg: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txIcon: { fontSize: 20 },
  txDesc: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  txCat: { fontSize: 12 },
  txAmount: { fontSize: 15, fontWeight: '600' },
  emptyText: { textAlign: 'center', padding: 20 },
  accountsScroll: { paddingLeft: 20 },
  accountCard: { width: 150, padding: 16, borderRadius: 16, marginRight: 12, borderWidth: 1 },
  accTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  accIcon: { fontSize: 20 },
  accName: { fontSize: 13, fontWeight: '500' },
  accBalance: { fontSize: 16, fontWeight: '700' },
});
