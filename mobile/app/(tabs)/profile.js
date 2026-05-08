import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuth } from '../../src/hooks/useAuth';
import { useAccounts } from '../../src/hooks/useAccounts';
import { useTransactions } from '../../src/hooks/useTransactions';
import { formatCurrency } from '../../src/utils/formatters';
import { useState } from 'react';
import { UserGuideModal } from '../../src/components/UserGuideModal';

export default function ProfileScreen() {
  const router = useRouter();
  const { theme, isDarkMode, toggleDarkMode } = useTheme();
  const { user, logout } = useAuth();
  const { accounts } = useAccounts();
  const { transactions } = useTransactions(50);
  const [notifications, setNotifications] = useState(true);
  const [guideVisible, setGuideVisible] = useState(false);

  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);
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
            <Text style={{ fontSize: 22 }}>ℹ️</Text>
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
            { icon: '💎', label: 'Tổng số dư', value: formatCurrency(totalBalance), color: theme.text },
            { icon: '📈', label: 'Tổng thu', value: formatCurrency(totalIncome), color: theme.success },
            { icon: '📉', label: 'Tổng chi', value: formatCurrency(totalExpense), color: theme.error },
          ].map(s => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border + '50' }]}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{s.label}</Text>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Cài đặt</Text>
        <View style={[styles.settingsCard, { backgroundColor: theme.surface, borderColor: theme.border + '50' }]}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: theme.primary + '15' }]}><Text style={styles.settingIcon}>🌙</Text></View>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Giao diện tối</Text>
            </View>
            <Switch value={isDarkMode} onValueChange={toggleDarkMode} trackColor={{ false: theme.border, true: theme.primary + '60' }} thumbColor={isDarkMode ? theme.primary : '#f4f3f4'} />
          </View>
          <View style={[styles.dividerLine, { backgroundColor: theme.border + '50' }]} />
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: theme.warning + '20' }]}><Text style={styles.settingIcon}>🔔</Text></View>
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
          { icon: '👤', title: 'Thông tin cá nhân', desc: 'Hiển thị tên và email đăng nhập của bạn.' },
          { icon: '💎', title: 'Tóm tắt tài khoản', desc: 'Một cái nhìn nhanh về tổng tài sản, tổng thu và tổng chi từ trước tới nay.' },
          { icon: '🌙', title: 'Giao diện tối', desc: 'Bật chế độ Dark Mode để bảo vệ mắt khi sử dụng ứng dụng vào ban đêm.' },
          { icon: '🚪', title: 'Đăng xuất', desc: 'Sử dụng nút này để thoát tài khoản trên thiết bị hiện tại.' }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 0.5 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  infoBtn: { padding: 4 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  profileCard: { alignItems: 'center', padding: 30, borderRadius: 16, marginBottom: 20, borderWidth: 1 },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { fontSize: 32, fontWeight: '700' },
  userName: { fontSize: 20, fontWeight: '600', marginBottom: 4 },
  userEmail: { fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 30 },
  statCard: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
  statIcon: { fontSize: 20, marginBottom: 8 },
  statLabel: { fontSize: 11, marginBottom: 4, textAlign: 'center', fontWeight: '500' },
  statValue: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginLeft: 4 },
  settingsCard: { borderRadius: 16, marginBottom: 30, borderWidth: 1 },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  settingIconBg: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  settingIcon: { fontSize: 16 },
  settingLabel: { fontSize: 15, fontWeight: '500' },
  dividerLine: { height: 0.5, marginLeft: 62 },
  logoutBtn: { padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  logoutText: { fontSize: 15, fontWeight: '600' },
  version: { textAlign: 'center', fontSize: 12, marginTop: 24 },
});
