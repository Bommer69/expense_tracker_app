import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { useNotifications } from '../../src/hooks/useNotifications';
import { useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { notificationStyles as styles } from '../../src/styles/notificationStyles';

const SEVERITY_COLORS = {
  info: { bg: '#E8F5E9', text: '#2E7D32' },
  warning: { bg: '#FFF3E0', text: '#E65100' },
  critical: { bg: '#FFEBEE', text: '#C62828' },
};

const TYPE_ICONS = {
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

        {/* Unread dot / delete */}
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

  if (loading && notifications.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Đang tải thông báo...</Text>
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
              Khi có biến động số dư, giao dịch lớn hoặc cảnh báo ngân sách, AI sẽ thông báo cho bạn tại đây.
            </Text>
          </View>
        }
      />
    </View>
  );
}
