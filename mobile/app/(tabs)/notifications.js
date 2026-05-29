import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { useNotifications } from '../../src/hooks/useNotifications';
import { useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { UserGuideModal } from '../../src/components/UserGuideModal';
import { vi } from 'date-fns/locale';
import { notificationStyles as styles } from '../../src/styles/notificationStyles';

const SEVERITY_COLORS = {
  info: { bg: '#E3F2FD', text: '#1565C0' },
  warning: { bg: '#FFF3E0', text: '#E65100' },
  critical: { bg: '#FFEBEE', text: '#C62828' },
};

const TYPE_ICONS = {
  transaction_update: 'swap-horizontal',
  balance_change: 'trending-down',
  large_transaction: 'cash',
  budget_alert: 'alert-circle',
  anomaly: 'warning',
  daily_summary: 'calendar',
  ai_insight: 'bulb',
};

function formatTime(dateStr) {
  try {
    const date = new Date(dateStr);
    return formatDistanceToNow(date, { addSuffix: true, locale: vi });
  } catch {
    return '';
  }
}

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [guideVisible, setGuideVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleClearAll = () => {
    const action = () => clearAllNotifications();

    if (Platform.OS === 'web') {
      if (window.confirm('Xóa tất cả thông báo?')) action();
      return;
    }
    Alert.alert('Xóa tất cả', 'Bạn có chắc muốn xóa tất cả thông báo?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: action },
    ]);
  };

  const handleDelete = (item) => {
    const action = () => deleteNotification(item._id || item.id);
    if (Platform.OS === 'web') {
      if (window.confirm('Xóa thông báo này?')) action();
      return;
    }
    Alert.alert('Xóa thông báo', 'Bạn có chắc?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: action },
    ]);
  };

  const renderItem = ({ item }) => {
    const isUnread = !item.read;
    const severity = item.severity || 'info';
    const severityColor = SEVERITY_COLORS[severity] || SEVERITY_COLORS.info;
    const iconName = TYPE_ICONS[item.type] || 'notifications';

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          setSelectedNotif(item);
          if (isUnread) markAsRead(item._id || item.id);
        }}
        onLongPress={() => handleDelete(item)}
        style={[
          styles.notifItem,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border + '50',
          },
          isUnread && {
            ...styles.notifUnread,
            borderLeftColor: theme.primary,
          },
        ]}
      >
        {/* Icon */}
        <View
          style={[
            styles.notifIcon,
            {
              backgroundColor: isUnread ? theme.primary + '15' : theme.border + '20',
            },
          ]}
        >
          <Ionicons
            name={iconName}
            size={20}
            color={isUnread ? theme.primary : theme.textSecondary}
          />
        </View>

        {/* Content */}
        <View style={styles.notifContent}>
          {/* Severity badge */}
          <View style={[styles.severityBadge, { backgroundColor: severityColor.bg }]}>
            <Text style={[styles.severityText, { color: severityColor.text }]}>
              {severity === 'critical' ? 'Quan trọng' : severity === 'warning' ? 'Cảnh báo' : 'Thông tin'}
            </Text>
          </View>

          <Text
            style={[styles.notifTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            style={[styles.notifMessage, { color: theme.textSecondary }]}
            numberOfLines={2}
          >
            {item.message}
          </Text>

          {/* Bottom row: time + AI badge */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.notifTime, { color: theme.textLight || theme.textSecondary + '80' }]}>
              {formatTime(item.createdAt)}
            </Text>
            {item.aiGenerated && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Ionicons name="sparkles" size={12} color={theme.primary} />
                <Text style={{ fontSize: 10, color: theme.primary, fontWeight: '500' }}>AI</Text>
              </View>
            )}
          </View>
        </View>

        {/* Unread dot */}
        <View style={styles.notifActions}>
          {isUnread && (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: theme.primary,
              }}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  /* Notification Detail Modal */
  const renderDetailModal = () => {
    if (!selectedNotif) return null;
    const item = selectedNotif;
    const severity = item.severity || 'info';
    const severityColor = SEVERITY_COLORS[severity] || SEVERITY_COLORS.info;
    const iconName = TYPE_ICONS[item.type] || 'notifications';
    const data = item.data || {};
    const extra = data.extra || {};

    return (
      <Modal
        visible={!!selectedNotif}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedNotif(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.surface }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View
                  style={[
                    styles.notifIcon,
                    { backgroundColor: theme.primary + '15', marginRight: 10 },
                  ]}
                >
                  <Ionicons name={iconName} size={22} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View
                    style={[
                      styles.severityBadge,
                      { backgroundColor: severityColor.bg, alignSelf: 'flex-start' },
                    ]}
                  >
                    <Text style={[styles.severityText, { color: severityColor.text }]}>
                      {severity === 'critical'
                        ? 'Quan trọng'
                        : severity === 'warning'
                          ? 'Cảnh báo'
                          : 'Thông tin'}
                    </Text>
                  </View>
                  <Text
                    style={[styles.notifTitle, { color: theme.text, fontSize: 16, marginTop: 4 }]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedNotif(null)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Full message */}
              <View style={styles.modalSection}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Nội dung</Text>
                <Text style={[styles.modalMessage, { color: theme.text }]}>{item.message}</Text>
              </View>

              {/* AI Analysis */}
              {item.aiAnalysis && (
                <View style={styles.modalSection}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      marginBottom: 4,
                    }}
                  >
                    <Ionicons name="sparkles" size={14} color={theme.primary} />
                    <Text style={[styles.modalLabel, { color: theme.primary }]}>AI Phân tích</Text>
                  </View>
                  <Text style={[styles.modalMessage, { color: theme.text }]}>
                    {item.aiAnalysis}
                  </Text>
                </View>
              )}

              {/* Details */}
              <View style={styles.modalSection}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Chi tiết</Text>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailKey, { color: theme.textSecondary }]}>Loại</Text>
                  <Text style={[styles.detailVal, { color: theme.text }]}>{item.type}</Text>
                </View>
                {data.amount != null && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailKey, { color: theme.textSecondary }]}>Số tiền</Text>
                    <Text
                      style={[styles.detailVal, { color: theme.text, fontWeight: '600' }]}
                    >
                      {data.amount.toLocaleString('vi-VN')} VND
                    </Text>
                  </View>
                )}
                {data.balanceAfter != null && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailKey, { color: theme.textSecondary }]}>Số dư sau</Text>
                    <Text style={[styles.detailVal, { color: theme.text }]}>
                      {data.balanceAfter.toLocaleString('vi-VN')} VND
                    </Text>
                  </View>
                )}
                {data.percentageChange != null && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailKey, { color: theme.textSecondary }]}>Thay đổi</Text>
                    <Text
                      style={[
                        styles.detailVal,
                        { color: data.percentageChange < 0 ? theme.error : '#4CAF50' },
                      ]}
                    >
                      {data.percentageChange >= 0 ? '+' : ''}
                      {data.percentageChange}%
                    </Text>
                  </View>
                )}
                {extra.categoryName && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailKey, { color: theme.textSecondary }]}>Danh mục</Text>
                    <Text style={[styles.detailVal, { color: theme.text }]}>
                      {extra.categoryName}
                    </Text>
                  </View>
                )}
                {extra.description && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailKey, { color: theme.textSecondary }]}>Mô tả</Text>
                    <Text style={[styles.detailVal, { color: theme.text }]}>
                      {extra.description}
                    </Text>
                  </View>
                )}
              </View>

              {/* Time & AI badge */}
              <View style={styles.modalSection}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailKey, { color: theme.textSecondary }]}>Thời gian</Text>
                  <Text style={[styles.detailVal, { color: theme.text }]}>
                    {new Date(item.createdAt).toLocaleString('vi-VN')}
                  </Text>
                </View>
                {item.aiGenerated && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailKey, { color: theme.textSecondary }]}>Nguồn</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="sparkles" size={14} color={theme.primary} />
                      <Text style={{ color: theme.primary, fontWeight: '500' }}>
                        AI Generated
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={[styles.modalActions, { borderTopColor: theme.border + '40' }]}>
              {!item.read && (
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: theme.primary + '15' }]}
                  onPress={() => {
                    markAsRead(item._id || item.id);
                    setSelectedNotif((prev) =>
                      prev ? { ...prev, read: true } : null
                    );
                  }}
                >
                  <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                  <Text style={{ color: theme.primary, fontWeight: '600', marginLeft: 6 }}>
                    Đánh dấu đã đọc
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.error + '15' }]}
                onPress={() => {
                  setSelectedNotif(null);
                  handleDelete(item);
                }}
              >
                <Ionicons name="trash-outline" size={18} color={theme.error} />
                <Text style={{ color: theme.error, fontWeight: '600', marginLeft: 6 }}>
                  Xoá
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading && notifications.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Đang tải thông báo...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border + '40' }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Thông báo</Text>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              AI Triggers
              {unreadCount > 0 && (
                <Text style={{ color: theme.primary, fontSize: 16 }}>
                  {' '}({unreadCount})
                </Text>
              )}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setGuideVisible(true)} style={styles.infoBtn}>
              <Ionicons name="book-outline" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
            {notifications.length > 0 && (
              <>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={markAllAsRead} style={styles.infoBtn}>
                    <Ionicons name="checkmark-done" size={22} color={theme.primary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleClearAll} style={styles.infoBtn}>
                  <Ionicons name="trash-outline" size={22} color={theme.error} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => String(item._id || item.id)}
        contentContainerStyle={[
          styles.scrollContent,
          notifications.length === 0 && { flex: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="notifications-off-outline"
              size={56}
              color={theme.textSecondary + '60'}
              style={styles.emptyIcon}
            />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Chưa có thông báo
            </Text>
            <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
              Khi có biến động số dư, giao dịch lớn hoặc cảnh báo ngân sách, AI sẽ thông báo cho
              bạn tại đây.
            </Text>
          </View>
        }
      />

      {/* Notification Detail Modal */}
      {renderDetailModal()}

      <UserGuideModal
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
        title="Hướng dẫn Thông báo"
        guideItems={[
          { iconName: 'notifications-outline', title: 'Thông báo AI', desc: 'AI tự động theo dõi tài chính và gửi thông báo khi có biến động số dư, giao dịch lớn, hoặc cảnh báo ngân sách.' },
          { iconName: 'alert-circle-outline', title: 'Phân loại mức độ', desc: 'Mỗi thông báo có nhãn: Thông tin (xanh), Cảnh báo (cam), Quan trọng (đỏ).' },
          { iconName: 'sparkles-outline', title: 'Phân tích AI', desc: 'Một số thông báo có kèm phân tích AI chi tiết — nhấn vào để xem đầy đủ.' },
          { iconName: 'checkmark-done-outline', title: 'Đánh dấu đã đọc', desc: 'Nhấn vào thông báo để đọc chi tiết và tự động đánh dấu đã đọc. Dùng nút checkmark ở góc phải để đánh dấu tất cả.' },
          { iconName: 'trash-outline', title: 'Xoá thông báo', desc: 'Nhấn giữ một thông báo để xoá, hoặc dùng nút thùng rác để xoá tất cả.' }
        ]}
      />
    </View>
  );
}
