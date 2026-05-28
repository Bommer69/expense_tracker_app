import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';

const ACTIONS = [
  { iconName: 'card-outline', label: 'Chi tiêu', route: '/transactions' },
  { iconName: 'wallet-outline', label: 'Thu nhập', route: '/transactions' },
  { iconName: 'chatbubbles', label: 'AI Chat', route: '/ai-chat' },
  { iconName: 'pie-chart-outline', label: 'Ngân sách', route: '/budget' },
];

export default function QuickActions() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 10 }}>
      {ACTIONS.map((item, i) => (
        <TouchableOpacity
          key={i}
          style={{
            flex: 1, alignItems: 'center', paddingVertical: 14,
            borderRadius: 16, borderWidth: 1,
            backgroundColor: theme.surface, borderColor: theme.border + '50',
          }}
          onPress={() => router.push(item.route)}
        >
          <Ionicons name={item.iconName} size={20} color={theme.primary} style={{ marginBottom: 8 }} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text }}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
