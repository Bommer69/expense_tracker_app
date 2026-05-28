import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export default function LoadingIndicator({ style, size = 'large' }) {
  const { theme } = useTheme();
  return (
    <View style={[{ padding: 24, alignItems: 'center' }, style]}>
      <ActivityIndicator size={size} color={theme.primary} />
    </View>
  );
}
