import { View, Text, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency, formatDateShort } from '../../utils/formatters';
import { transactionStyles as s } from '../../styles/transactionStyles';

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
  return ICON_MAP[name] || 'card-outline';
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

export default function TransactionItem({ item, onEdit, onDelete }) {
  const { theme } = useTheme();
  const isIncome = item.type === 'income';

  return (
    <Swipeable
      renderRightActions={() => (
        <RightActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} theme={theme} />
      )}
      overshootRight={false}
    >
      <View style={[s.txItem, { borderBottomColor: theme.border + '60', backgroundColor: theme.background }]}>
        <View style={[s.txIcon, {
          backgroundColor: isIncome ? theme.success + '12' : theme.error + '12',
        }]}>
          <Ionicons
            name={mapIcon(item.categoryId?.icon) || 'card-outline'}
            size={18}
            color={isIncome ? theme.success : theme.error}
          />
        </View>
        <TouchableOpacity
          style={s.txMid}
          onLongPress={() => onDelete(item)}
          delayLongPress={600}
        >
          <Text style={[s.txDesc, { color: theme.text }]} numberOfLines={1}>
            {item.description || item.categoryId?.name || 'Giao dịch'}
          </Text>
          <Text style={[s.txDate, { color: theme.textSecondary }]}>
            {formatDateShort(item.date)}{item.categoryId?.name ? ` · ${item.categoryId.name}` : ''}
          </Text>
        </TouchableOpacity>
        <View style={s.txRight}>
          <Text style={[s.txAmt, { color: isIncome ? theme.success : theme.error }]}>
            {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
          </Text>
          <TouchableOpacity
            style={s.deleteIconBtn}
            onPress={() => onDelete(item)}
          >
            <Ionicons name="trash-outline" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </Swipeable>
  );
}
