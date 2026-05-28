import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

export default function EmptyState({ icon = 'document-text-outline', message = 'Chưa có dữ liệu', iconSize = 40 }) {
  const { theme } = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: 24 }}>
      <Ionicons name={icon} size={iconSize} color={theme.textSecondary} style={{ marginBottom: 8 }} />
      <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{message}</Text>
    </View>
  );
}
