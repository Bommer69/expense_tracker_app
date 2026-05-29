import { View, Text, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency } from '../../utils/formatters';
import { budgetStyles as s } from '../../styles/budgetStyles';

const ICON_MAP = {
  '🍔': 'restaurant-outline',
  '🚗': 'car-outline',
  '🛍️': 'bag-outline',
  '📄': 'document-text-outline',
  '🎮': 'game-controller-outline',
  '💊': 'medical-outline',
  '📚': 'book-outline',
  '💰': 'cash-outline',
  '🎁': 'gift-outline',
  '💵': 'wallet-outline',
  '🏠': 'home-outline',
  '✈️': 'airplane-outline',
  '👕': 'shirt-outline',
  '💻': 'laptop-outline',
  '📱': 'phone-portrait-outline',
  '🎬': 'film-outline',
  '⚽': 'football-outline',
  '🎵': 'musical-notes-outline',
  '🐾': 'paw-outline',
  '💡': 'bulb-outline',
  '🔧': 'build-outline',
  '📦': 'cube-outline',
};

function mapIcon(name) {
  if (name && name.includes('-outline')) return name;
  return ICON_MAP[name] || 'pie-chart-outline';
}

function getStatusColor(percent, theme) {
  if (percent >= 100) return theme.error;
  if (percent >= 80) return theme.warning;
  return theme.success;
}

function RightActions({ onEdit, onDelete, theme }) {
  return (
    <View style={s.swipeActions}>
      <TouchableOpacity style={[s.swipeBtn, { backgroundColor: theme.primary }]} onPress={onEdit}>
        <Ionicons name="pencil-outline" size={18} color="#fff" />
        <Text style={s.swipeBtnText}>Sửa</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.swipeBtn, { backgroundColor: theme.error }]} onPress={onDelete}>
        <Ionicons name="trash-outline" size={18} color="#fff" />
        <Text style={s.swipeBtnText}>Xóa</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function BudgetItem({ item, onEdit, onDelete }) {
  const { theme } = useTheme();
  const percent = item.amount > 0 ? (item.spent / item.amount) * 100 : 0;
  const clampedPercent = Math.min(percent, 100);
  const statusColor = getStatusColor(percent, theme);
  const isOver = percent >= 100;

  return (
    <Swipeable
      renderRightActions={() => (
        <RightActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} theme={theme} />
      )}
      overshootRight={false}
    >
      <View style={[s.budgetItem, { borderBottomColor: theme.border + '40', backgroundColor: theme.background }]}>
        <View style={s.budgetTop}>
          <View style={s.budgetLeft}>
            <Ionicons name={mapIcon(item.categoryId?.icon)} size={20} color={theme.text} />
            <Text style={[s.budgetName, { color: theme.text }]}>{item.categoryId?.name || 'Danh mục'}</Text>
            {isOver && (
              <Ionicons name="warning-outline" size={18} color={theme.error} />
            )}
          </View>
          <View style={s.budgetTopRight}>
            <Text style={[s.budgetPercent, { color: statusColor }]}>{Math.round(percent)}%</Text>
          </View>
        </View>
        <View style={[s.progressTrack, { backgroundColor: theme.border + '40' }]}>
          <View style={[s.progressFill, { backgroundColor: statusColor, width: `${clampedPercent}%` }]} />
        </View>
        <View style={s.budgetBottom}>
          <Text style={[{ color: theme.text, fontSize: 14, fontWeight: '600' }]}>{formatCurrency(item.spent || 0)}</Text>
          <Text style={[{ color: theme.textSecondary, fontSize: 13 }]}>/ {formatCurrency(item.amount)}</Text>
        </View>
      </View>
    </Swipeable>
  );
}
