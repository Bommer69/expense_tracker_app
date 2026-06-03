import { View, Text, TouchableOpacity, ScrollView, Alert, Switch, Platform, Modal, TextInput, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuth } from '../../src/hooks/useAuth';
import { useTransactions } from '../../src/hooks/useTransactions';
import { formatCurrency } from '../../src/utils/formatters';
import { useState, useEffect } from 'react';
import { UserGuideModal } from '../../src/components/UserGuideModal';
import { Ionicons } from '@expo/vector-icons';
import { profileStyles as styles } from '../../src/styles/profileStyles';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export default function ProfileScreen() {
  const router = useRouter();
  const { theme, isDarkMode, toggleDarkMode } = useTheme();
  const { user, updateUser, logout } = useAuth();
    const { transactions } = useTransactions(50);
  const [notifications, setNotifications] = useState(true);
  const [guideVisible, setGuideVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalBalance = totalIncome - totalExpense;
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

  /** Mở modal chỉnh sửa tên */
  const openEditName = () => {
    setEditName(user?.name || '');
    setEditModalVisible(true);
  };

  /** Lưu tên mới */
  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (trimmed.length < 2) {
      Alert.alert('Lỗi', 'Tên phải có ít nhất 2 ký tự');
      return;
    }
    setSubmitting(true);
    try {
      await updateUser({ name: trimmed });
      setEditModalVisible(false);
      Alert.alert('✅', 'Cập nhật tên thành công!');
    } catch (err) {
      Alert.alert('Lỗi', err?.error || 'Không thể cập nhật tên');
    } finally {
      setSubmitting(false);
    }
  };

  /** Chọn ảnh từ thư viện hoặc chụp mới */
  const handlePickAvatar = async (useCamera = false) => {
    try {
      // Xin quyền
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Cần quyền', 'Vui lòng cấp quyền Camera để chụp ảnh đại diện.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Cần quyền', 'Vui lòng cấp quyền truy cập thư viện ảnh.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset?.uri) return;

      setSubmitting(true);

      // Resize ảnh xuống 400x400 trước (avatar không cần ảnh gốc full HD)
      const resized = await manipulateAsync(
        asset.uri,
        [{ resize: { width: 400, height: 400 } }],
        { format: SaveFormat.JPEG, compress: 0.7 }
      );

      // Đọc ảnh đã resize thành base64 — file chỉ còn ~50-100KB
      const base64 = await FileSystem.readAsStringAsync(resized.uri, {
        encoding: 'base64',
      });

      // Gửi lên server dưới dạng data URL
      await updateUser({
        avatar: `data:image/jpeg;base64,${base64}`,
      });

      Alert.alert('✅', 'Cập nhật ảnh đại diện thành công!');
    } catch (err) {
      console.error('Avatar pick error:', err?.response?.data || err);
      const msg = err?.error || err?.response?.data?.error || 'Không thể cập nhật ảnh đại diện';
      Alert.alert('Lỗi', msg);
    } finally {
      setSubmitting(false);
    }
  };

  /** Menu chọn nguồn ảnh */
  const showAvatarOptions = () => {
    if (Platform.OS === 'web') {
      handlePickAvatar(false);
      return;
    }
    Alert.alert('Chọn ảnh đại diện', '', [
      { text: 'Chụp ảnh', onPress: () => handlePickAvatar(true) },
      { text: 'Chọn từ thư viện', onPress: () => handlePickAvatar(false) },
      { text: 'Hủy', style: 'cancel' },
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
        {/* Profile Card — Có thể nhấn để đổi avatar */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={showAvatarOptions}
          style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.border + '50' }]}
        >
          <View style={styles.avatarWrap}>
            {user?.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.primary + '15' }]}>
                <Text style={[styles.avatarText, { color: theme.primary }]}>{initials}</Text>
              </View>
            )}
            {/* Badge chỉnh sửa */}
            <View style={[styles.avatarBadge, { backgroundColor: theme.primary }]}>
              <Ionicons name="camera" size={14} color="#FFF" />
            </View>
          </View>

          {/* Tên — có thể nhấn để sửa */}
          <TouchableOpacity onPress={openEditName}>
            <Text style={[styles.userName, { color: theme.text }]}>
              {user?.name || 'Người dùng'}{' '}
              <Ionicons name="create-outline" size={16} color={theme.textSecondary} />
            </Text>
          </TouchableOpacity>
          <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{user?.email || ''}</Text>
        </TouchableOpacity>

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

      {/* Modal chỉnh sửa tên */}
      <Modal visible={editModalVisible} transparent animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.editModal, { backgroundColor: theme.background }]}>
            <Text style={[styles.editModalTitle, { color: theme.text }]}>Chỉnh sửa tên</Text>
            <TextInput
              style={[styles.editInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border + '60' }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Nhập tên của bạn"
              placeholderTextColor={theme.textSecondary}
              autoFocus
              maxLength={50}
            />
            <View style={styles.editModalActions}>
              <TouchableOpacity
                style={[styles.editBtn, { borderColor: theme.border }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editBtn, { backgroundColor: theme.primary, borderColor: theme.primary }, submitting && { opacity: 0.6 }]}
                onPress={handleSaveName}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={{ color: '#FFF', fontWeight: '600' }}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <UserGuideModal
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
        title="Hướng dẫn Hồ sơ"
        guideItems={[
          { iconName: 'person-outline', title: 'Thông tin cá nhân', desc: 'Nhấn vào tên để chỉnh sửa. Nhấn vào avatar để đổi ảnh đại diện (chụp hoặc chọn từ thư viện).' },
          { iconName: 'wallet-outline', title: 'Tóm tắt tài chính', desc: 'Xem nhanh tổng số dư, tổng thu nhập và tổng chi tiêu của toàn bộ thời gian sử dụng.' },
          { iconName: 'moon-outline', title: 'Giao diện tối (Dark Mode)', desc: 'Bật/tắt chế độ tối để bảo vệ mắt và tiết kiệm pin.' },
          { iconName: 'notifications-outline', title: 'Cài đặt thông báo', desc: 'Bật/tắt nhận thông báo từ AI về biến động tài chính.' },
          { iconName: 'log-out-outline', title: 'Đăng xuất', desc: 'Thoát tài khoản khỏi thiết bị hiện tại.' }
        ]}
      />
    </View>
  );
}
