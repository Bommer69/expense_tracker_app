import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Modal, TextInput, Alert, FlatList, ActivityIndicator, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useCategories } from '../../src/hooks/useCategories';
import { useRecurringTransactions } from '../../src/hooks/useRecurringTransactions';
import { formatCurrency, formatDateShort, formatNumberInput, parseFormattedNumber } from '../../src/utils/formatters';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { UserGuideModal } from '../../src/components/UserGuideModal';
import { ConfirmModal } from '../../src/components/ConfirmModal';
import { Ionicons } from '@expo/vector-icons';
import { getErrorMessage } from '../../src/utils/errorHandler';
import { Swipeable } from 'react-native-gesture-handler';

const ICONS = [
  { name: 'restaurant-outline', display: '🍔' },
  { name: 'car-outline', display: '🚗' },
  { name: 'bag-outline', display: '🛍️' },
  { name: 'document-text-outline', display: '📄' },
  { name: 'game-controller-outline', display: '🎮' },
  { name: 'medical-outline', display: '💊' },
  { name: 'book-outline', display: '📚' },
  { name: 'cash-outline', display: '💰' },
  { name: 'gift-outline', display: '🎁' },
  { name: 'wallet-outline', display: '💵' },
  { name: 'home-outline', display: '🏠' },
  { name: 'airplane-outline', display: '✈️' },
  { name: 'shirt-outline', display: '👕' },
  { name: 'laptop-outline', display: '💻' },
  { name: 'phone-portrait-outline', display: '📱' },
  { name: 'film-outline', display: '🎬' },
  { name: 'football-outline', display: '⚽' },
  { name: 'musical-notes-outline', display: '🎵' },
  { name: 'paw-outline', display: '🐾' },
  { name: 'bulb-outline', display: '💡' },
  { name: 'build-outline', display: '🔧' },
  { name: 'cube-outline', display: '📦' }
];

export default function TransactionsScreen() {
  const { theme } = useTheme();
  const { transactions, loading, fetchTransactions, createTransaction, updateTransaction, deleteTransaction } = useTransactions(100);
  const { categories, fetchCategories, createCategory, deleteCategory } = useCategories();
  const { recurrings, fetchRecurrings, createRecurring, removeRecurring } = useRecurringTransactions();
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);
  const [recurringModalVisible, setRecurringModalVisible] = useState(false);
  
  // Confirm Modal state
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({ amount: '', description: '', type: 'expense' });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [newCat, setNewCat] = useState({ name: '', icon: 'cube-outline', color: '#6C5CE7' });
  const [recurringForm, setRecurringForm] = useState({
    amount: '',
    description: '',
    type: 'expense',
    frequency: 'monthly',
    categoryId: '',
  });

  // Refresh data when screen focuses
  useFocusEffect(
    useCallback(() => {
      fetchCategories();
      fetchTransactions();
      fetchRecurrings();
    }, [])
  );

  const onRefresh = async () => { setRefreshing(true); await fetchTransactions(); await fetchCategories(); setRefreshing(false); };

  const filtered = transactions.filter(tx => {
    const matchType = filterType === 'all' || tx.type === filterType;
    const matchSearch = !searchQuery || (tx.description || '').toLowerCase().includes(searchQuery.toLowerCase()) || (tx.categoryId?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const summary = useMemo(() => {
    const inc = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income: inc, expense: exp };
  }, [filtered]);

  // Helper function to map old emoji icons to new Ionicons
  const mapIconToIonicons = (iconName) => {
    const iconMap = {
      // Map old emoji names to Ionicons
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
      '📦': 'cube-outline'
    };
    
    // If it's already an Ionicon name (contains -outline), return it
    if (iconName && iconName.includes('-outline')) {
      return iconName;
    }
    
    // Return mapped icon or default
    return iconMap[iconName] || 'card-outline';
  };

  const closeModal = () => {
    setModalVisible(false);
    setFormData({ amount: '', description: '', type: 'expense' });
    setSelectedCategory(null);
    setSelectedDate(new Date());
    setEditingTx(null);
  };

  const handleEdit = (tx) => {
    setFormData({
      amount: formatNumberInput(String(tx.amount)),
      description: tx.description || '',
      type: tx.type,
    });
    setSelectedCategory(tx.categoryId && typeof tx.categoryId === 'object' ? tx.categoryId : null);
    setSelectedDate(new Date(tx.date));
    setEditingTx(tx);
    setPickerMonth(new Date(tx.date));
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    const amount = parseFormattedNumber(formData.amount);
    if (!amount || amount <= 0) { Alert.alert('Lỗi', 'Nhập số tiền hợp lệ'); return; }
    if (!selectedCategory) { Alert.alert('Lỗi', 'Chọn danh mục'); return; }
    setSubmitting(true);
    try {
      const payload = {
        amount,
        description: formData.description,
        type: formData.type,
        categoryId: selectedCategory._id,
        date: selectedDate.toISOString(),
      };
      if (editingTx) {
        await updateTransaction(editingTx._id, payload);
      } else {
        await createTransaction(payload);
      }
      closeModal();
    } catch (err) {
      const fallback = editingTx ? 'Không thể cập nhật giao dịch' : 'Không thể tạo giao dịch';
      Alert.alert('Lỗi', getErrorMessage(err) || fallback);
    } finally { setSubmitting(false); }
  };

  const handleCreateCategory = async () => {
    if (!newCat.name.trim()) { Alert.alert('Lỗi', 'Nhập tên danh mục'); return; }
    try {
      const created = await createCategory({ name: newCat.name.trim(), icon: newCat.icon, color: newCat.color, type: formData.type });
      setSelectedCategory(created);
      setCatModalVisible(false);
      setNewCat({ name: '', icon: 'cube-outline', color: '#6C5CE7' });
    } catch (err) { Alert.alert('Lỗi', getErrorMessage(err) || 'Không thể tạo danh mục'); }
  };

  const handleDelete = (tx) => {
    setDeleteTarget({ type: 'transaction', item: tx });
    setConfirmVisible(true);
  };

  const handleDeleteCategory = (cat) => {
    if (cat.isDefault) {
      if (Platform.OS === 'web') alert('Đây là danh mục mặc định.');
      else Alert.alert('Không thể xóa', 'Đây là danh mục mặc định.');
      return;
    }
    setDeleteTarget({ type: 'category', item: cat });
    setConfirmVisible(true);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setConfirmVisible(false);
    
    try {
      if (deleteTarget.type === 'transaction') {
        await deleteTransaction(deleteTarget.item._id);
      } else if (deleteTarget.type === 'category') {
        await deleteCategory(deleteTarget.item._id);
        if (selectedCategory?._id === deleteTarget.item._id) setSelectedCategory(null);
      }
    } catch (err) {
      const msg = getErrorMessage(err) || 'Không thể xóa mục này';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Lỗi', msg);
    } finally {
      setDeleteTarget(null);
    }
  };

  const filteredCats = categories.filter(c => c.type === formData.type);
  const recurringCats = categories.filter(c => c.type === recurringForm.type);

  const handleCreateRecurring = async () => {
    const amount = parseFormattedNumber(recurringForm.amount);
    if (!amount || amount <= 0) {
      Alert.alert('Lỗi', 'Nhập số tiền định kỳ hợp lệ');
      return;
    }
    if (!recurringForm.categoryId) {
      Alert.alert('Lỗi', 'Chọn danh mục cho giao dịch định kỳ');
      return;
    }
    try {
      await createRecurring({
        amount,
        description: recurringForm.description,
        type: recurringForm.type,
        frequency: recurringForm.frequency,
        categoryId: recurringForm.categoryId,
        startDate: new Date().toISOString()
      });
      setRecurringForm({ amount: '', description: '', type: 'expense', frequency: 'monthly', categoryId: '' });
      await fetchTransactions();
    } catch (err) {
      Alert.alert('Lỗi', getErrorMessage(err) || 'Không thể tạo giao dịch định kỳ');
    }
  };

  const handleDeleteRecurring = async (item) => {
    try {
      await removeRecurring(item._id);
      await fetchTransactions();
    } catch (err) {
      Alert.alert('Lỗi', getErrorMessage(err) || 'Không thể xóa giao dịch định kỳ');
    }
  };

  // Simple date helpers
  const adjustDate = (days) => { const d = new Date(selectedDate); d.setDate(d.getDate() + days); setSelectedDate(d); };
  const formatDisplayDate = (d) => {
    if (d.toDateString() === new Date().toDateString()) return 'Hôm nay';
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Hôm qua';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Month grid for date picker
  const getDaysInMonth = (date) => {
    const y = date.getFullYear(), m = date.getMonth();
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    return { first: first === 0 ? 6 : first - 1, days };
  };
  const [pickerMonth, setPickerMonth] = useState(new Date());

  const renderRightActions = (tx) => (
    <View style={s.swipeActions}>
      <TouchableOpacity
        style={[s.swipeBtn, { backgroundColor: theme.primary }]}
        onPress={() => handleEdit(tx)}
      >
        <Ionicons name="pencil-outline" size={18} color="#fff" />
        <Text style={s.swipeBtnText}>Sửa</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.swipeBtn, { backgroundColor: theme.error }]}
        onPress={() => handleDelete(tx)}
      >
        <Ionicons name="trash-outline" size={18} color="#fff" />
        <Text style={s.swipeBtnText}>Xóa</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => (
    <Swipeable renderRightActions={() => renderRightActions(item)} overshootRight={false}>
      <View style={[s.txItem, { borderBottomColor: theme.border + '60', backgroundColor: theme.background }]}>
        <View style={[s.txIcon, { backgroundColor: item.type === 'income' ? theme.success + '12' : theme.error + '12' }]}>
          <Ionicons name={mapIconToIonicons(item.categoryId?.icon) || 'card-outline'} size={18} color={item.type === 'income' ? theme.success : theme.error} />
        </View>
        <View style={s.txMid}>
          <Text style={[s.txDesc, { color: theme.text }]} numberOfLines={1}>{item.description || item.categoryId?.name || 'Giao dịch'}</Text>
          <Text style={[s.txDate, { color: theme.textSecondary }]}>{formatDateShort(item.date)}{item.categoryId?.name ? ` · ${item.categoryId.name}` : ''}</Text>
        </View>
        <Text style={[s.txAmt, { color: item.type === 'income' ? theme.success : theme.error }]}>
          {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
        </Text>
      </View>
    </Swipeable>
  );

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: theme.border + '40' }]}>  
        <View style={s.headerTop}>
          <Text style={[s.headerTitle, { color: theme.text }]}>Giao dịch</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity onPress={() => setRecurringModalVisible(true)} style={s.infoBtn}>
              <Ionicons name="sync-outline" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setGuideVisible(true)} style={s.infoBtn}>
              <Ionicons name="book-outline" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={s.summaryRow}>
          <View style={s.summaryItem}>
            <Text style={[s.summaryLabel, { color: theme.textSecondary }]}>Thu nhập</Text>
            <Text style={[s.summaryVal, { color: theme.success }]}>+{formatCurrency(summary.income)}</Text>
          </View>
          <View style={[s.summaryDot, { backgroundColor: theme.border }]} />
          <View style={s.summaryItem}>
            <Text style={[s.summaryLabel, { color: theme.textSecondary }]}>Chi tiêu</Text>
            <Text style={[s.summaryVal, { color: theme.error }]}>-{formatCurrency(summary.expense)}</Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: theme.surface, borderColor: theme.border + '50' }]}>
        <Ionicons name="search-outline" size={14} color={theme.textSecondary} />
        <TextInput style={[s.searchInput, { color: theme.text }]} placeholder="Tìm kiếm..." placeholderTextColor={theme.textSecondary} value={searchQuery} onChangeText={setSearchQuery} />
        {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={16} color={theme.textSecondary} /></TouchableOpacity> : null}
      </View>

      {/* Filters */}
      <View style={s.filterRow}>
        {[{ k: 'all', l: 'Tất cả' }, { k: 'income', l: 'Thu nhập' }, { k: 'expense', l: 'Chi tiêu' }].map(f => (
          <TouchableOpacity key={f.k} style={[s.filterBtn, { borderColor: theme.border }, filterType === f.k && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => setFilterType(f.k)}>
            <Text style={[s.filterText, { color: theme.textSecondary }, filterType === f.k && { color: '#fff' }]}>{f.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList data={filtered} renderItem={renderItem} keyExtractor={item => item._id} contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListEmptyComponent={<View style={s.empty}><Ionicons name="document-text-outline" size={40} color={theme.textSecondary} style={{ marginBottom: 8 }} /><Text style={[s.emptyText, { color: theme.textSecondary }]}>{searchQuery ? 'Không tìm thấy' : 'Chưa có giao dịch'}</Text></View>} />

      {/* FAB */}
      <TouchableOpacity style={[s.fab, { backgroundColor: theme.primary }]} onPress={() => setModalVisible(true)}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add Transaction Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: theme.background }]}>
            <View style={s.handle} />
            <View style={s.modalHead}>
              <Text style={[s.modalTitle, { color: theme.text }]}>{editingTx ? 'Sửa giao dịch' : 'Thêm giao dịch'}</Text>
              <TouchableOpacity onPress={closeModal}><Ionicons name="close" size={20} color={theme.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Type toggle */}
              <View style={[s.typeRow, { backgroundColor: theme.surface }]}>
                <TouchableOpacity style={[s.typeBtn, formData.type === 'expense' && { backgroundColor: theme.error }]} onPress={() => { setFormData({ ...formData, type: 'expense' }); setSelectedCategory(null); }}>
                  <Text style={[s.typeText, formData.type === 'expense' && { color: '#fff' }]}>Chi tiêu</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.typeBtn, formData.type === 'income' && { backgroundColor: theme.success }]} onPress={() => { setFormData({ ...formData, type: 'income' }); setSelectedCategory(null); }}>
                  <Text style={[s.typeText, formData.type === 'income' && { color: '#fff' }]}>Thu nhập</Text>
                </TouchableOpacity>
              </View>

              {/* Amount */}
              <View style={s.amtRow}>
                <Text style={[s.amtPrefix, { color: theme.primary }]}>₫</Text>
                <TextInput style={[s.amtInput, { color: theme.text }]} placeholder="0" placeholderTextColor={theme.textLight || '#ccc'} keyboardType="numeric" value={formData.amount} onChangeText={t => setFormData({ ...formData, amount: formatNumberInput(t) })} />
              </View>

              {/* Description */}
              <TextInput style={[s.descInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border + '60' }]} placeholder="Mô tả (tùy chọn)" placeholderTextColor={theme.textSecondary} value={formData.description} onChangeText={t => setFormData({ ...formData, description: t })} />

              {/* Date Picker */}
              <Text style={[s.sectionLabel, { color: theme.textSecondary }]}>Ngày</Text>
              <TouchableOpacity style={[s.dateBtn, { backgroundColor: theme.surface, borderColor: theme.border + '60' }]} onPress={() => { setPickerMonth(new Date(selectedDate)); setShowDatePicker(!showDatePicker); }}>
                <Text style={[{ color: theme.text, fontSize: 15 }]}>{formatDisplayDate(selectedDate)}</Text>
                <View style={s.dateNav}>
                  <TouchableOpacity onPress={() => adjustDate(-1)} style={s.dateArrow}><Ionicons name="chevron-back" size={16} color={theme.textSecondary} /></TouchableOpacity>
                  <TouchableOpacity onPress={() => adjustDate(1)} style={s.dateArrow}><Ionicons name="chevron-forward" size={16} color={theme.textSecondary} /></TouchableOpacity>
                </View>
              </TouchableOpacity>

              {showDatePicker && (
                <View style={[s.calendarWrap, { backgroundColor: theme.surface, borderColor: theme.border + '40' }]}>
                  <View style={s.calHead}>
                    <TouchableOpacity onPress={() => { const d = new Date(pickerMonth); d.setMonth(d.getMonth() - 1); setPickerMonth(d); }}><Ionicons name="chevron-back" size={18} color={theme.primary} /></TouchableOpacity>
                    <Text style={[{ color: theme.text, fontWeight: '600', fontSize: 14 }]}>{pickerMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</Text>
                    <TouchableOpacity onPress={() => { const d = new Date(pickerMonth); d.setMonth(d.getMonth() + 1); setPickerMonth(d); }}><Ionicons name="chevron-forward" size={18} color={theme.primary} /></TouchableOpacity>
                  </View>
                  <View style={s.calDays}>
                    {['T2','T3','T4','T5','T6','T7','CN'].map(d => <Text key={d} style={[s.calDayLabel, { color: theme.textSecondary }]}>{d}</Text>)}
                  </View>
                  <View style={s.calGrid}>
                    {(() => {
                      const { first, days } = getDaysInMonth(pickerMonth);
                      const cells = [];
                      for (let i = 0; i < first; i++) cells.push(<View key={`e${i}`} style={s.calCell} />);
                      for (let d = 1; d <= days; d++) {
                        const thisDate = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), d);
                        const isSel = thisDate.toDateString() === selectedDate.toDateString();
                        cells.push(
                          <TouchableOpacity key={d} style={[s.calCell, isSel && { backgroundColor: theme.primary, borderRadius: 20 }]} onPress={() => { setSelectedDate(thisDate); setShowDatePicker(false); }}>
                            <Text style={[s.calDay, { color: theme.text }, isSel && { color: '#fff' }]}>{d}</Text>
                          </TouchableOpacity>
                        );
                      }
                      return cells;
                    })()}
                  </View>
                </View>
              )}

              {/* Category */}
              <View style={s.catHeader}>
                <Text style={[s.sectionLabel, { color: theme.textSecondary, marginBottom: 0 }]}>Danh mục (Nhấn giữ để xóa)</Text>
                <TouchableOpacity onPress={() => setCatModalVisible(true)}><Text style={{ color: theme.primary, fontSize: 13, fontWeight: '600' }}>+ Thêm mới</Text></TouchableOpacity>
              </View>
              <View style={s.catGrid}>
                {filteredCats.map(cat => (
                  <TouchableOpacity key={cat._id} style={[s.catChip, { backgroundColor: theme.surface, borderColor: theme.border + '60' }, selectedCategory?._id === cat._id && { backgroundColor: theme.primary + '15', borderColor: theme.primary }]} onPress={() => setSelectedCategory(cat)} onLongPress={() => handleDeleteCategory(cat)}>
                    <Ionicons name={mapIconToIonicons(cat.icon) || 'cube-outline'} size={16} color={theme.text} />
                    <Text style={[s.catName, { color: theme.text }]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Submit */}
              <TouchableOpacity style={[s.submitBtn, { backgroundColor: theme.primary }, submitting && { opacity: 0.5 }]} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>{editingTx ? 'Cập nhật' : 'Thêm giao dịch'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Category Modal */}
      <Modal visible={catModalVisible} animationType="fade" transparent onRequestClose={() => setCatModalVisible(false)}>
        <View style={s.overlay}>
          <View style={[s.catModal, { backgroundColor: theme.background }]}>
            <Text style={[s.modalTitle, { color: theme.text, marginBottom: 16 }]}>Thêm danh mục</Text>
            <TextInput style={[s.descInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border + '60' }]} placeholder="Tên danh mục" placeholderTextColor={theme.textSecondary} value={newCat.name} onChangeText={t => setNewCat({ ...newCat, name: t })} />
            <Text style={[s.sectionLabel, { color: theme.textSecondary }]}>Chọn icon</Text>
            <View style={s.iconGrid}>
              {ICONS.map(ic => (
                <TouchableOpacity key={ic.name} style={[s.iconBtn, { backgroundColor: theme.surface }, newCat.icon === ic.name && { backgroundColor: theme.primary + '20', borderColor: theme.primary, borderWidth: 1.5 }]} onPress={() => setNewCat({ ...newCat, icon: ic.name })}>
                  <Ionicons name={ic.name} size={20} color={theme.text} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.catModalBtns}>
              <TouchableOpacity style={[s.catModalBtn, { borderColor: theme.border }]} onPress={() => setCatModalVisible(false)}>
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.catModalBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={handleCreateCategory}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>Tạo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <UserGuideModal
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
        title="Hướng dẫn Giao dịch"
        guideItems={[
          { iconName: 'add-circle-outline', title: 'Thêm Giao dịch', desc: 'Ấn dấu (+) ở góc dưới màn hình để tạo thu nhập hoặc chi tiêu. Bạn có thể chọn ngày trong quá khứ nếu lỡ quên nhập.' },
          { iconName: 'pricetag-outline', title: 'Thêm Danh mục', desc: 'Khi đang thêm giao dịch, bạn có thể tự do tạo danh mục mới với biểu tượng icon và tên tùy thích.' },
          { iconName: 'search-outline', title: 'Tìm kiếm & Bộ lọc', desc: 'Sử dụng thanh tìm kiếm để tìm chi tiêu, hoặc dùng bộ lọc (Thu nhập/Chi tiêu) để dễ quan sát hơn.' },
          { iconName: 'trash-outline', title: 'Xóa giao dịch', desc: 'Vuốt sang trái trên giao dịch để hiện nút Sửa và Xóa.' }
        ]}
      />

      <ConfirmModal 
        visible={confirmVisible}
        title={deleteTarget?.type === 'category' ? 'Xóa danh mục' : 'Xóa giao dịch'}
        message={deleteTarget?.type === 'category' ? `Bạn có chắc muốn xóa danh mục "${deleteTarget?.item?.name}"?` : 'Bạn có chắc muốn xóa giao dịch này?'}
        onConfirm={executeDelete}
        onCancel={() => { setConfirmVisible(false); setDeleteTarget(null); }}
      />

      <Modal visible={recurringModalVisible} animationType="slide" transparent onRequestClose={() => setRecurringModalVisible(false)}>
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: theme.background, maxHeight: '92%' }]}>
            <View style={s.handle} />
            <View style={s.modalHead}>
              <Text style={[s.modalTitle, { color: theme.text }]}>Giao dịch định kỳ</Text>
              <TouchableOpacity onPress={() => setRecurringModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[s.sectionLabel, { color: theme.textSecondary }]}>Tạo mới</Text>
              <View style={[s.typeRow, { backgroundColor: theme.surface }]}>
                <TouchableOpacity style={[s.typeBtn, recurringForm.type === 'expense' && { backgroundColor: theme.error }]} onPress={() => setRecurringForm(prev => ({ ...prev, type: 'expense', categoryId: '' }))}>
                  <Text style={[s.typeText, recurringForm.type === 'expense' && { color: '#fff' }]}>Chi tiêu</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.typeBtn, recurringForm.type === 'income' && { backgroundColor: theme.success }]} onPress={() => setRecurringForm(prev => ({ ...prev, type: 'income', categoryId: '' }))}>
                  <Text style={[s.typeText, recurringForm.type === 'income' && { color: '#fff' }]}>Thu nhập</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[s.descInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border + '60' }]}
                placeholder="Số tiền"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                value={recurringForm.amount}
                onChangeText={(t) => setRecurringForm(prev => ({ ...prev, amount: formatNumberInput(t) }))}
              />
              <TextInput
                style={[s.descInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border + '60' }]}
                placeholder="Mô tả (VD: Tiền nhà, Lương)"
                placeholderTextColor={theme.textSecondary}
                value={recurringForm.description}
                onChangeText={(t) => setRecurringForm(prev => ({ ...prev, description: t }))}
              />
              <View style={s.filterRow}>
                {[{ k: 'daily', l: 'Hàng ngày' }, { k: 'weekly', l: 'Hàng tuần' }, { k: 'monthly', l: 'Hàng tháng' }].map(f => (
                  <TouchableOpacity key={f.k} style={[s.filterBtn, { borderColor: theme.border }, recurringForm.frequency === f.k && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => setRecurringForm(prev => ({ ...prev, frequency: f.k }))}>
                    <Text style={[s.filterText, { color: theme.textSecondary }, recurringForm.frequency === f.k && { color: '#fff' }]}>{f.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.catGrid}>
                {recurringCats.map(cat => (
                  <TouchableOpacity
                    key={cat._id}
                    style={[s.catChip, { backgroundColor: theme.surface, borderColor: theme.border + '60' }, recurringForm.categoryId === cat._id && { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}
                    onPress={() => setRecurringForm(prev => ({ ...prev, categoryId: cat._id }))}
                  >
                    <Ionicons name={mapIconToIonicons(cat.icon) || 'cube-outline'} size={16} color={theme.text} />
                    <Text style={[s.catName, { color: theme.text }]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[s.submitBtn, { backgroundColor: theme.primary }]} onPress={handleCreateRecurring}>
                <Text style={s.submitText}>Lưu giao dịch định kỳ</Text>
              </TouchableOpacity>

              <Text style={[s.sectionLabel, { color: theme.textSecondary, marginTop: 20 }]}>Danh sách hiện tại</Text>
              {recurrings.length === 0 ? (
                <Text style={{ color: theme.textSecondary }}>Chưa có giao dịch định kỳ.</Text>
              ) : recurrings.map((r) => (
                <View key={r._id} style={[s.txItem, { borderBottomColor: theme.border + '60' }]}>
                  <View style={s.txMid}>
                    <Text style={[s.txDesc, { color: theme.text }]}>{r.description || r.categoryId?.name || 'Giao dịch định kỳ'}</Text>
                    <Text style={[s.txDate, { color: theme.textSecondary }]}>
                      {r.frequency === 'daily' ? 'Hàng ngày' : r.frequency === 'weekly' ? 'Hàng tuần' : 'Hàng tháng'} · {r.categoryId?.name || 'Danh mục'}
                    </Text>
                  </View>
                  <View style={s.txRight}>
                    <Text style={[s.txAmt, { color: r.type === 'income' ? theme.success : theme.error }]}>
                      {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount)}
                    </Text>
                    <TouchableOpacity style={s.deleteBtn} onPress={() => handleDeleteRecurring(r)}>
                      <Ionicons name="trash-outline" size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 0.5 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  infoBtn: { padding: 4 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 16 },
  summaryItem: {},
  summaryLabel: { fontSize: 12, marginBottom: 2 },
  summaryVal: { fontSize: 15, fontWeight: '700' },
  summaryDot: { width: 3, height: 3, borderRadius: 2 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 12, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, marginLeft: 8, paddingVertical: 0 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 4, gap: 8 },
  filterBtn: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '500' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 0.5 },
  txIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txMid: { flex: 1 },
  txDesc: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  txDate: { fontSize: 12 },
  txAmt: { fontSize: 15, fontWeight: '600' },
  txRight: { alignItems: 'flex-end', justifyContent: 'center' },
  deleteBtn: { padding: 4, marginTop: -2 },
  swipeActions: { flexDirection: 'row', alignItems: 'stretch' },
  swipeBtn: { width: 72, justifyContent: 'center', alignItems: 'center', gap: 4, paddingVertical: 14 },
  swipeBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15 },
  fab: { position: 'absolute', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
  fabText: { fontSize: 28, color: '#fff', fontWeight: '300', marginTop: -1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '88%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D0D0D0', alignSelf: 'center', marginBottom: 12 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  typeRow: { flexDirection: 'row', borderRadius: 12, padding: 3, marginBottom: 20, gap: 3 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  typeText: { fontSize: 14, fontWeight: '600', color: '#888' },
  amtRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  amtPrefix: { fontSize: 28, fontWeight: '700', marginRight: 6 },
  amtInput: { flex: 1, fontSize: 32, fontWeight: '700' },
  descInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  dateBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  dateNav: { flexDirection: 'row', gap: 12 },
  dateArrow: { paddingHorizontal: 8 },
  calendarWrap: { borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 16, marginTop: -8 },
  calHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  calDays: { flexDirection: 'row' },
  calDayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', marginBottom: 6 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  calDay: { fontSize: 14 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  catChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, gap: 6 },
  catName: { fontSize: 13, fontWeight: '500' },
  submitBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  catModal: { margin: 20, borderRadius: 20, padding: 20, marginTop: 'auto', marginBottom: 'auto' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  iconBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  catModalBtns: { flexDirection: 'row', gap: 10 },
  catModalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
});
