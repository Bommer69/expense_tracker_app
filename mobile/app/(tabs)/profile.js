import { View, Text, TouchableOpacity, ScrollView, Alert, Switch, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuth } from '../../src/hooks/useAuth';
import { useAccounts } from '../../src/hooks/useAccounts';
import { useTransactions } from '../../src/hooks/useTransactions';
import { formatCurrency } from '../../src/utils/formatters';
import { useState, useEffect } from 'react';
import { UserGuideModal } from '../../src/components/UserGuideModal';
import { Ionicons } from '@expo/vector-icons';
import { profileStyles as styles } from '../../src/styles/profileStyles';

export default function ProfileScreen() {
  const router = useRouter();
  const { theme, isDarkMode, toggleDarkMode } = useTheme();
  const { user, logout } = useAuth();
  const { getBalance } = useAccounts();
  const { transactions } = useTransactions(50);
  const [notifications, setNotifications] = useState(true);
  const [guideVisible, setGuideVisible] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);

  // Tính tổng số dư từ server (chính xác với mọi giao dịch)
  useEffect(() => {
    getBalance()
      .then(data => {
        if (data && data.length > 0) {
          const total = data.reduce((s, a) => s + (a.calculatedBalance || 0), 0);
          setTotalBalance(total);
        }
      })
      .catch(() => {});
  }, [getBalance]);
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const initials = (user?.name || 'U').charAt(0).toUpperCase();

  const handleLogout = () => {
    const performLogout = async () => {
      await logout();
      router.replace('/(auth)/login');
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Bạn có chắc muốn đăng xuất?');
      if (confirmed) {
        performLogout();
      }
      return;
    }

    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: performLogout,
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Minimal Header */}
      <View style={[styles.header, { borderBottomColor: theme.border + '40' }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Hồ sơ</Text>
          <TouchableOpacity onPress={() => setGuideVisible(true)} style={styles.infoBtn}>
            <Ionicons name="book-outline" size={24} color="#6B7194" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.border + '50' }]}>
          <View style={[styles.avatar, { backgroundColor: theme.primary + '15' }]}>
            <Text style={[styles.avatarText, { color: theme.primary }]}>{initials}</Text>
          </View>
          <Text style={[styles.userName, { color: theme.text }]}>{user?.name || 'Người dùng'}</Text>
          <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{user?.email || ''}</Text>
        </View>

        <View style={styles.statsRow}>
          {[
            { iconName: 'cash-outline', label: 'Tổng số dư', value: formatCurrency(totalBalance), color: theme.text },
            { iconName: 'add-circle-outline', label: 'Tổng thu', value: formatCurrency(totalIncome), color: theme.success },
            { iconName: 'remove-circle-outline', label: 'Tổng chi', value: formatCurrency(totalExpense), color: theme.error },
          ].map(s => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border + '50' }]}>
              <Ionicons name={s.iconName} size={20} color={s.color} style={styles.statIcon} />
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{s.label}</Text>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Cài đặt</Text>
        <View style={[styles.settingsCard, { backgroundColor: theme.surface, borderColor: theme.border + '50' }]}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name="moon-outline" size={18} color={theme.primary} />
              </View>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Giao diện tối</Text>
            </View>
            <Switch value={isDarkMode} onValueChange={toggleDarkMode} trackColor={{ false: theme.border, true: theme.primary + '60' }} thumbColor={isDarkMode ? theme.primary : '#f4f3f4'} />
          </View>
          <View style={[styles.dividerLine, { backgroundColor: theme.border + '50' }]} />
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: theme.warning + '20' }]}>
                <Ionicons name="notifications-outline" size={18} color={theme.warning} />
              </View>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Thông báo</Text>
            </View>
            <Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: theme.border, true: theme.primary + '60' }} thumbColor={notifications ? theme.primary : '#f4f3f4'} />
          </View>
        </View>

        <TouchableOpacity style={[styles.logoutBtn, { borderColor: theme.error + '40' }]} onPress={handleLogout}>
          <Text style={[styles.logoutText, { color: theme.error }]}>Đăng xuất</Text>
        </TouchableOpacity>
        
        <Text style={[styles.version, { color: theme.textLight }]}>Expense Tracker v1.0.0</Text>
      </ScrollView>

      <UserGuideModal
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
        title="Hướng dẫn Hồ sơ"
        guideItems={[
          { iconName: 'person-outline', title: 'Thông tin cá nhân', desc: 'Hiển thị tên và email đăng nhập của bạn.' },
          { iconName: 'wallet-outline', title: 'Tóm tắt tài khoản', desc: 'Một cái nhìn nhanh về tổng tài sản, tổng thu và tổng chi từ trước tới nay.' },
          { iconName: 'moon-outline', title: 'Giao diện tối', desc: 'Bật chế độ Dark Mode để bảo vệ mắt khi sử dụng ứng dụng vào ban đêm.' },
          { iconName: 'log-out-outline', title: 'Đăng xuất', desc: 'Sử dụng nút này để thoát tài khoản trên thiết bị hiện tại.' }
        ]}
      />
    </View>
  );
}

