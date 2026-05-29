import { View, Text, TouchableOpacity, ScrollView, RefreshControl, useContext } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAccounts } from '../../src/hooks/useAccounts';
import { useTransactions, useTransactionSummary } from '../../src/hooks/useTransactions';
import { useState, useCallback } from 'react';
import { useAuth } from '../../src/hooks/useAuth';
import { UserGuideModal } from '../../src/components/UserGuideModal';
import { Ionicons } from '@expo/vector-icons';
import BalanceCard from '../../src/components/home/BalanceCard';
import QuickActions from '../../src/components/home/QuickActions';
import RecentTransactions from '../../src/components/home/RecentTransactions';
import { homeStyles as styles } from '../../src/styles/homeStyles';
import { notificationStyles } from '../../src/styles/notificationStyles';
import { NotificationContext } from '../../src/context/NotificationContext';

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { unreadCount } = useContext(NotificationContext);
  const { getBalance } = useAccounts();
  const { transactions, loading: tL, fetchTransactions } = useTransactions(5);
  const { summary, loading: sL, fetchSummary } = useTransactionSummary();
  const [refreshing, setRefreshing] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);

  const loading = tL || sL;

  const refreshBalance = useCallback(async () => {
    const data = await getBalance().catch(() => null);
    if (data && data.length > 0) {
      const total = data.reduce((sum, acc) => sum + (acc.calculatedBalance || 0), 0);
      setTotalBalance(total);
    }
  }, [getBalance]);

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
      fetchSummary();
      refreshBalance();
    }, [fetchTransactions, fetchSummary, refreshBalance])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTransactions(), fetchSummary(), refreshBalance()]);
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
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/notifications')}
              style={styles.infoBtn}
            >
              <View>
                <Ionicons name="notifications-outline" size={24} color="#6B7194" />
                {unreadCount > 0 && (
                  <View style={[notificationStyles.badgeContainer, { backgroundColor: '#FF3B30', top: -2, right: -4 }]}>
                    <Text style={notificationStyles.badgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setGuideVisible(true)} style={styles.infoBtn}>
              <Ionicons name="book-outline" size={24} color="#6B7194" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <BalanceCard totalBalance={totalBalance} summary={summary} loading={loading && !refreshing} />
        <QuickActions />
        <RecentTransactions transactions={transactions} loading={loading && !refreshing} />
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
