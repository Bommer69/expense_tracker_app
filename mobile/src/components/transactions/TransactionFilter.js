import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { transactionStyles as s } from '../../styles/transactionStyles';

const FILTERS = [
  { k: 'all', l: 'Tất cả' },
  { k: 'income', l: 'Thu nhập' },
  { k: 'expense', l: 'Chi tiêu' },
];

export default function TransactionFilter({ searchQuery, onSearchChange, filterType, onFilterChange }) {
  const { theme } = useTheme();

  return (
    <>
      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: theme.surface, borderColor: theme.border + '50' }]}>
        <Ionicons name="search-outline" size={14} color={theme.textSecondary} />
        <TextInput
          style={[s.searchInput, { color: theme.text }]}
          placeholder="Tìm kiếm..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => onSearchChange('')}>
            <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filters */}
      <View style={s.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.k}
            style={[
              s.filterBtn,
              { borderColor: theme.border },
              filterType === f.k && { backgroundColor: theme.primary, borderColor: theme.primary },
            ]}
            onPress={() => onFilterChange(f.k)}
          >
            <Text
              style={[
                s.filterText,
                { color: theme.textSecondary },
                filterType === f.k && { color: '#fff' },
              ]}
            >
              {f.l}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}
