import { View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export default function Card({ children, style, padding = 20, borderRadius = 20 }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderRadius,
          padding,
          borderWidth: 1,
          borderColor: theme.border + '60',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
