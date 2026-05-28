import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export default function SectionHeader({ title, actionLabel, onAction, style }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          marginTop: 24,
          marginBottom: 16,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>{title}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.primary }}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
