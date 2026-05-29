import React, { useEffect, useRef, useContext } from 'react';
import { Animated, Text, TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { NotificationContext } from '../context/NotificationContext';
import { useTheme } from '../hooks/useTheme';

const TYPE_ICONS = {
  transaction_update: 'swap-horizontal',
  balance_change: 'trending-down',
  large_transaction: 'cash',
  budget_alert: 'alert-circle',
  anomaly: 'warning',
  daily_summary: 'calendar',
  ai_insight: 'bulb',
};

function getIconColor(severity, theme) {
  switch (severity) {
    case 'critical':
      return theme.error || '#FF3B30';
    case 'warning':
      return theme.warning || '#FF9500';
    default:
      return theme.primary || '#6C5CE7';
  }
}

function getSeverityLabel(severity) {
  switch (severity) {
    case 'critical': return 'Quan trọng';
    case 'warning': return 'Cảnh báo';
    default: return 'Thông báo';
  }
}

export default function NotificationBanner() {
  const { latestNotification, dismissLatestNotification } = useContext(NotificationContext);
  const { theme } = useTheme();
  const router = useRouter();
  const translateY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    if (latestNotification) {
      // Huỷ timer cũ nếu có
      if (timerRef.current) clearTimeout(timerRef.current);

      // Reset animation về trạng thái ban đầu trước khi chạy lại
      translateY.setValue(-200);
      opacity.setValue(0);

      // Slide in + fade in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 150,
          mass: 0.8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss sau 5 giây
      timerRef.current = setTimeout(() => {
        dismissBanner();
      }, 5000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [latestNotification]);

  const dismissBanner = () => {
    if (timerRef.current) clearTimeout(timerRef.current);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -200,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (dismissLatestNotification) dismissLatestNotification();
    });
  };

  const handlePress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    router.push('/(tabs)/notifications');
    // Ẩn banner ngay
    translateY.setValue(-200);
    opacity.setValue(0);
    if (dismissLatestNotification) dismissLatestNotification();
  };

  if (!latestNotification) return null;

  const iconName = TYPE_ICONS[latestNotification.type] || 'notifications';
  const iconColor = getIconColor(latestNotification.severity, theme);
  const severityLabel = getSeverityLabel(latestNotification.severity);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderLeftColor: iconColor,
          shadowColor: theme.shadow || '#000',
          transform: [{ translateY }],
          opacity,
          borderColor: theme.border || 'rgba(0,0,0,0.06)',
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '18' }]}>
          <Ionicons name={iconName} size={22} color={iconColor} />
        </View>

        {/* Nội dung */}
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {latestNotification.title}
            </Text>
            <View style={[styles.severityBadge, { backgroundColor: iconColor + '20' }]}>
              <Text style={[styles.severityText, { color: iconColor }]}>
                {severityLabel}
              </Text>
            </View>
          </View>
          <Text style={[styles.message, { color: theme.textSecondary }]} numberOfLines={2}>
            {latestNotification.message}
          </Text>
        </View>

        {/* Nút close */}
        <TouchableOpacity
          onPress={dismissBanner}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={16} color={theme.textLight || '#999'} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 12,
    left: 12,
    right: 12,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    zIndex: 9999,
    elevation: 30,
    borderLeftWidth: 4,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 6,
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
  },
  closeButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
