import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Modal, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useBudgets } from '../../src/hooks/useBudgets';
import { useCategories } from '../../src/hooks/useCategories';
import { formatCurrency, formatNumberInput, getCurrentMonth, parseFormattedNumber } from '../../src/utils/formatters';
import { useState, useEffect, useCallback } from 'react';
import { UserGuideModal } from '../../src/components/UserGuideModal';
import { ConfirmModal } from '../../src/components/ConfirmModal';
import { Ionicons } from '@expo/vector-icons';
import { getErrorMessage } from '../../src/utils/errorHandler';
import { budgetStyles as s } from '../../src/styles/budgetStyles';

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
const MONTHS_VI = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

export default function BudgetScreen() {
  const { theme } = useTheme();
  const { budgets, loading, fetchBudgets, createBudget, deleteBudget } = useBudgets();
  const { categories, fetchCategories, createCategory, deleteCategory } = useCategories();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);
  
  // Confirm Modal state
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({ amount: '', month: getCurrentMonth() });
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [submitting, setSubmitting] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', icon: 'cube-outline', color: '#6C5CE7' });
  const [viewMonth, setViewMonth] = useState(getCurrentMonth());

  // Refresh data when screen focuses
  useFocusEffect(
    useCallback(() => {
      fetchCategories();
      fetchBudgets(viewMonth);
    }, [viewMonth])
  );

  const onRefresh = async () => { setRefreshing(true); await Promise.all([fetchBudgets(viewMonth), fetchCategories()]); setRefreshing(false); };

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
    return iconMap[iconName] || 'pie-chart-outline';
  };

  const getStatusColor = (p) => p >= 100 ? theme.error : p >= 80 ? theme.warning : theme.success;

  const handleSubmit = async () => {
    const amount = parseFormattedNumber(formData.amount);
    if (!amount || amount <= 0) { Alert.alert('Lỗi', 'Nhập số tiền hợp lệ'); return; }
    if (!selectedCategory) { Alert.alert('Lỗi', 'Chọn danh mục'); return; }
    setSubmitting(true);
    try {
      await createBudget({ categoryId: selectedCategory._id, amount, month: formData.month });
      setModalVisible(false); setFormData({ amount: '', month: getCurrentMonth() }); setSelectedCategory(null);
      setViewMonth(formData.month);
    } catch (err) { Alert.alert('Lỗi', getErrorMessage(err) || 'Không thể tạo ngân sách'); } finally { setSubmitting(false); }
  };

  const handleCreateCategory = async () => {
    if (!newCat.name.trim()) { Alert.alert('Lỗi', 'Nhập tên danh mục'); return; }
    try {
      const created = await createCategory({ name: newCat.name.trim(), icon: newCat.icon, color: newCat.color, type: 'expense' });
      setSelectedCategory(created);
      setCatModalVisible(false);
      setNewCat({ name: '', icon: 'cube-outline', color: '#6C5CE7' });
    } catch (err) { Alert.alert('Lỗi', getErrorMessage(err) || 'Không thể tạo danh mục'); }
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

  const handleDeleteBudget = (budget) => {
    setDeleteTarget({ type: 'budget', item: budget });
    setConfirmVisible(true);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setConfirmVisible(false);
    
    try {
      if (deleteTarget.type === 'budget') {
        await deleteBudget(deleteTarget.item._id, viewMonth);
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

  const expCats = categories.filter(c => c.type === 'expense');
  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spent || 0), 0);
  const totalPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const remaining = totalBudget - totalSpent;

  const formatMonth = (m) => {
    const [y, mo] = m.split('-');
    return `${MONTHS_VI[parseInt(mo) - 1]} ${y}`;
  };

  const navigateMonth = (dir) => {
    const [y, m] = viewMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const selectMonth = (monthIdx) => {
    const m = `${pickerYear}-${String(monthIdx + 1).padStart(2, '0')}`;
    setFormData({ ...formData, month: m });
    setShowMonthPicker(false);
  };

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: theme.border + '40' }]}>
        <View style={s.headerTop}>
          <Text style={[s.headerTitle, { color: theme.text }]}>Ngân sách</Text>
          <TouchableOpacity onPress={() => setGuideVisible(true)} style={s.infoBtn}>
            <Ionicons name="book-outline" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={s.monthNav}>
          <TouchableOpacity onPress={() => navigateMonth(-1)} style={s.monthArrow}><Ionicons name="chevron-back" size={20} color={theme.primary} /></TouchableOpacity>
          <Text style={[s.monthText, { color: theme.text }]}>{formatMonth(viewMonth)}</Text>
          <TouchableOpacity onPress={() => navigateMonth(1)} style={s.monthArrow}><Ionicons name="chevron-forward" size={20} color={theme.primary} /></TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}>

        {/* Overview */}
        {budgets.length > 0 && (
          <View style={[s.overviewCard, { backgroundColor: theme.surface, borderColor: theme.border + '30' }]}>
            <View style={s.overviewRow}>
              <View style={s.overviewItem}>
                <Text style={[s.overviewLabel, { color: theme.textSecondary }]}>Ngân sách</Text>
                <Text style={[s.overviewVal, { color: theme.text }]}>{formatCurrency(totalBudget)}</Text>
              </View>
              <View style={s.overviewItem}>
                <Text style={[s.overviewLabel, { color: theme.textSecondary }]}>Đã chi</Text>
                <Text style={[s.overviewVal, { color: theme.error }]}>{formatCurrency(totalSpent)}</Text>
              </View>
              <View style={s.overviewItem}>
                <Text style={[s.overviewLabel, { color: theme.textSecondary }]}>Còn lại</Text>
                <Text style={[s.overviewVal, { color: remaining >= 0 ? theme.success : theme.error }]}>{formatCurrency(remaining)}</Text>
              </View>
            </View>
            <View style={[s.progressTrack, { backgroundColor: theme.border + '40' }]}>
              <View style={[s.progressFill, { backgroundColor: getStatusColor(totalPercent), width: `${Math.min(totalPercent, 100)}%` }]} />
            </View>
            <Text style={[s.progressLabel, { color: theme.textSecondary }]}>{Math.round(totalPercent)}% đã sử dụng</Text>
          </View>
        )}

        {/* Budget List */}
        {budgets.length === 0 ? (
          <View style={s.emptyWrap}>
            <Ionicons name="wallet-outline" size={40} color={theme.textSecondary} style={{ marginBottom: 8 }} />
            <Text style={[s.emptyText, { color: theme.textSecondary }]}>Chưa có ngân sách</Text>
            <Text style={[{ color: theme.textLight, fontSize: 13, marginTop: 4 }]}>Nhấn + để tạo ngân sách mới</Text>
          </View>
        ) : budgets.map(item => {
          const percent = item.amount > 0 ? (item.spent / item.amount) * 100 : 0;
          const clampedPercent = Math.min(percent, 100);
          return (
            <View key={item._id} style={[s.budgetItem, { borderBottomColor: theme.border + '40' }]}>
              <View style={s.budgetTop}>
                <View style={s.budgetLeft}>
                  <Ionicons name={mapIconToIonicons(item.categoryId?.icon) || 'pie-chart-outline'} size={20} color={theme.text} />
                  <Text style={[s.budgetName, { color: theme.text }]}>{item.categoryId?.name || 'Danh mục'}</Text>
                </View>
                <View style={s.budgetTopRight}>
                  <Text style={[s.budgetPercent, { color: getStatusColor(percent) }]}>{Math.round(percent)}%</Text>
                  <TouchableOpacity style={s.deleteBtn} onPress={() => handleDeleteBudget(item)}>
                    <Ionicons name="trash-outline" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[s.progressTrack, { backgroundColor: theme.border + '40' }]}>
                <View style={[s.progressFill, { backgroundColor: getStatusColor(percent), width: `${clampedPercent}%` }]} />
              </View>
              <View style={s.budgetBottom}>
                <Text style={[{ color: theme.text, fontSize: 14, fontWeight: '600' }]}>{formatCurrency(item.spent || 0)}</Text>
                <Text style={[{ color: theme.textSecondary, fontSize: 13 }]}>/ {formatCurrency(item.amount)}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={[s.fab, { backgroundColor: theme.primary }]} onPress={() => { setFormData({ amount: '', month: viewMonth }); setModalVisible(true); }}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      {/* Create Budget Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: theme.background }]}>
            <View style={s.handle} />
            <View style={s.modalHead}>
              <Text style={[s.modalTitle, { color: theme.text }]}>Tạo ngân sách</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={20} color={theme.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Amount */}
              <View style={s.amtRow}>
                <Text style={[s.amtPrefix, { color: theme.primary }]}>₫</Text>
                <TextInput style={[s.amtInput, { color: theme.text }]} placeholder="0" placeholderTextColor={theme.textLight || '#ccc'} keyboardType="numeric" value={formData.amount} onChangeText={t => setFormData({ ...formData, amount: formatNumberInput(t) })} />
              </View>

              {/* Month Picker */}
              <Text style={[s.sectionLabel, { color: theme.textSecondary }]}>Tháng áp dụng</Text>
              <TouchableOpacity style={[s.dateBtn, { backgroundColor: theme.surface, borderColor: theme.border + '60' }]} onPress={() => { setPickerYear(parseInt(formData.month.split('-')[0])); setShowMonthPicker(!showMonthPicker); }}>
                <Text style={[{ color: theme.text, fontSize: 15 }]}>{formatMonth(formData.month)}</Text>
                <Text style={{ color: theme.textSecondary }}>▾</Text>
              </TouchableOpacity>

              {showMonthPicker && (
                <View style={[s.monthPickerWrap, { backgroundColor: theme.surface, borderColor: theme.border + '40' }]}>
                  <View style={s.yearNav}>
                    <TouchableOpacity onPress={() => setPickerYear(pickerYear - 1)}><Ionicons name="chevron-back" size={18} color={theme.primary} /></TouchableOpacity>
                    <Text style={[{ color: theme.text, fontWeight: '600', fontSize: 15 }]}>{pickerYear}</Text>
                    <TouchableOpacity onPress={() => setPickerYear(pickerYear + 1)}><Ionicons name="chevron-forward" size={18} color={theme.primary} /></TouchableOpacity>
                  </View>
                  <View style={s.monthGrid}>
                    {MONTHS_VI.map((name, idx) => {
                      const m = `${pickerYear}-${String(idx + 1).padStart(2, '0')}`;
                      const isSel = m === formData.month;
                      return (
                        <TouchableOpacity key={idx} style={[s.monthCell, isSel && { backgroundColor: theme.primary, borderRadius: 10 }]} onPress={() => selectMonth(idx)}>
                          <Text style={[s.monthCellText, { color: theme.text }, isSel && { color: '#fff' }]}>{name.replace('Tháng ', 'T')}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Category */}
              <View style={s.catHeader}>
                <Text style={[s.sectionLabel, { color: theme.textSecondary, marginBottom: 0 }]}>Danh mục (Nhấn giữ để xóa)</Text>
                <TouchableOpacity onPress={() => setCatModalVisible(true)}><Text style={{ color: theme.primary, fontSize: 13, fontWeight: '600' }}>+ Thêm mới</Text></TouchableOpacity>
              </View>
              <View style={s.catGrid}>
                {expCats.map(cat => (
                  <TouchableOpacity key={cat._id} style={[s.catChip, { backgroundColor: theme.surface, borderColor: theme.border + '60' }, selectedCategory?._id === cat._id && { backgroundColor: theme.primary + '15', borderColor: theme.primary }]} onPress={() => setSelectedCategory(cat)} onLongPress={() => handleDeleteCategory(cat)}>
                    <Ionicons name={mapIconToIonicons(cat.icon) || 'cube-outline'} size={16} color={theme.text} />
                    <Text style={[s.catName, { color: theme.text }]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Submit */}
              <TouchableOpacity style={[s.submitBtn, { backgroundColor: theme.primary }, submitting && { opacity: 0.5 }]} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>Tạo ngân sách</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Category Modal */}
      <Modal visible={catModalVisible} animationType="fade" transparent onRequestClose={() => setCatModalVisible(false)}>
        <View style={s.overlay}>
          <View style={[s.catModalWrap, { backgroundColor: theme.background }]}>
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
        title="Hướng dẫn Ngân sách"
        guideItems={[
          { iconName: 'wallet-outline', title: 'Tạo ngân sách', desc: 'Sử dụng nút (+) để tạo giới hạn chi tiêu cho từng danh mục trong một tháng cụ thể.' },
          { iconName: 'color-palette-outline', title: 'Màu sắc cảnh báo', desc: 'Thanh tiến độ sẽ có màu Xanh (an toàn), Vàng (sắp hết) hoặc Đỏ (vượt ngân sách) tùy mức tiêu xài của bạn.' },
          { iconName: 'calendar-outline', title: 'Quản lý theo tháng', desc: 'Sử dụng phím mũi tên ở trên cùng để xem lại ngân sách của các tháng trước.' },
          { iconName: 'trash-outline', title: 'Xóa', desc: 'Nhấn vào biểu tượng thùng rác ở góc trên bên phải của mỗi mục để xóa ngân sách đã thiết lập.' }
        ]}
      />

      <ConfirmModal 
        visible={confirmVisible}
        title={deleteTarget?.type === 'category' ? 'Xóa danh mục' : 'Xóa ngân sách'}
        message={deleteTarget?.type === 'category' ? `Bạn có chắc muốn xóa danh mục "${deleteTarget?.item?.name}"?` : `Bạn có chắc muốn xóa ngân sách "${deleteTarget?.item?.categoryId?.name}"?`}
        onConfirm={executeDelete}
        onCancel={() => { setConfirmVisible(false); setDeleteTarget(null); }}
      />
    </View>
  );
}

