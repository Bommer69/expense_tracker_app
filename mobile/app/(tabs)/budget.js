import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Modal, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useBudgets } from '../../src/hooks/useBudgets';
import { useCategories } from '../../src/hooks/useCategories';
import { formatCurrency, getCurrentMonth } from '../../src/utils/formatters';
import { useState, useEffect, useCallback } from 'react';
import { UserGuideModal } from '../../src/components/UserGuideModal';
import { ConfirmModal } from '../../src/components/ConfirmModal';

const ICONS = ['🍔','🚗','🛍️','📄','🎮','💊','📚','💰','🎁','💵','🏠','✈️','👕','💻','📱','🎬','⚽','🎵','🐾','💡','🔧','📦'];
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
  const [newCat, setNewCat] = useState({ name: '', icon: '📦', color: '#6C5CE7' });
  const [viewMonth, setViewMonth] = useState(getCurrentMonth());

  // Refresh data when screen focuses
  useFocusEffect(
    useCallback(() => {
      fetchCategories();
      fetchBudgets(viewMonth);
    }, [viewMonth])
  );

  const onRefresh = async () => { setRefreshing(true); await Promise.all([fetchBudgets(viewMonth), fetchCategories()]); setRefreshing(false); };

  const getStatusColor = (p) => p >= 100 ? theme.error : p >= 80 ? theme.warning : theme.success;

  const handleSubmit = async () => {
    if (!formData.amount || isNaN(parseFloat(formData.amount))) { Alert.alert('Lỗi', 'Nhập số tiền hợp lệ'); return; }
    if (!selectedCategory) { Alert.alert('Lỗi', 'Chọn danh mục'); return; }
    setSubmitting(true);
    try {
      await createBudget({ categoryId: selectedCategory._id, amount: parseFloat(formData.amount), month: formData.month });
      setModalVisible(false); setFormData({ amount: '', month: getCurrentMonth() }); setSelectedCategory(null);
      setViewMonth(formData.month);
    } catch { Alert.alert('Lỗi', 'Không thể tạo ngân sách'); } finally { setSubmitting(false); }
  };

  const handleCreateCategory = async () => {
    if (!newCat.name.trim()) { Alert.alert('Lỗi', 'Nhập tên danh mục'); return; }
    try {
      const created = await createCategory({ name: newCat.name.trim(), icon: newCat.icon, color: newCat.color, type: 'expense' });
      setSelectedCategory(created);
      setCatModalVisible(false);
      setNewCat({ name: '', icon: '📦', color: '#6C5CE7' });
    } catch { Alert.alert('Lỗi', 'Không thể tạo danh mục'); }
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
        await deleteBudget(deleteTarget.item._id);
      } else if (deleteTarget.type === 'category') {
        await deleteCategory(deleteTarget.item._id);
        if (selectedCategory?._id === deleteTarget.item._id) setSelectedCategory(null);
      }
    } catch {
      if (Platform.OS === 'web') alert('Không thể xóa mục này');
      else Alert.alert('Lỗi', 'Không thể xóa mục này');
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
            <Text style={{ fontSize: 22 }}>ℹ️</Text>
          </TouchableOpacity>
        </View>
        <View style={s.monthNav}>
          <TouchableOpacity onPress={() => navigateMonth(-1)} style={s.monthArrow}><Text style={{ color: theme.primary, fontSize: 20 }}>‹</Text></TouchableOpacity>
          <Text style={[s.monthText, { color: theme.text }]}>{formatMonth(viewMonth)}</Text>
          <TouchableOpacity onPress={() => navigateMonth(1)} style={s.monthArrow}><Text style={{ color: theme.primary, fontSize: 20 }}>›</Text></TouchableOpacity>
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
            <Text style={{ fontSize: 40, marginBottom: 8 }}>🎯</Text>
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
                  <Text style={{ fontSize: 20 }}>{item.categoryId?.icon || '📦'}</Text>
                  <Text style={[s.budgetName, { color: theme.text }]}>{item.categoryId?.name || 'Danh mục'}</Text>
                </View>
                <View style={s.budgetTopRight}>
                  <Text style={[s.budgetPercent, { color: getStatusColor(percent) }]}>{Math.round(percent)}%</Text>
                  <TouchableOpacity style={s.deleteBtn} onPress={() => handleDeleteBudget(item)}>
                    <Text style={{ fontSize: 16, opacity: 0.6 }}>🗑️</Text>
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
              <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{ fontSize: 20, color: theme.textSecondary }}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Amount */}
              <View style={s.amtRow}>
                <Text style={[s.amtPrefix, { color: theme.primary }]}>₫</Text>
                <TextInput style={[s.amtInput, { color: theme.text }]} placeholder="0" placeholderTextColor={theme.textLight || '#ccc'} keyboardType="numeric" value={formData.amount} onChangeText={t => setFormData({ ...formData, amount: t })} />
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
                    <TouchableOpacity onPress={() => setPickerYear(pickerYear - 1)}><Text style={{ color: theme.primary, fontSize: 18 }}>‹</Text></TouchableOpacity>
                    <Text style={[{ color: theme.text, fontWeight: '600', fontSize: 15 }]}>{pickerYear}</Text>
                    <TouchableOpacity onPress={() => setPickerYear(pickerYear + 1)}><Text style={{ color: theme.primary, fontSize: 18 }}>›</Text></TouchableOpacity>
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
                    <Text style={{ fontSize: 16 }}>{cat.icon}</Text>
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
                <TouchableOpacity key={ic} style={[s.iconBtn, { backgroundColor: theme.surface }, newCat.icon === ic && { backgroundColor: theme.primary + '20', borderColor: theme.primary, borderWidth: 1.5 }]} onPress={() => setNewCat({ ...newCat, icon: ic })}>
                  <Text style={{ fontSize: 20 }}>{ic}</Text>
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
          { icon: '🎯', title: 'Tạo ngân sách', desc: 'Sử dụng nút (+) để tạo giới hạn chi tiêu cho từng danh mục trong một tháng cụ thể.' },
          { icon: '🎨', title: 'Màu sắc cảnh báo', desc: 'Thanh tiến độ sẽ có màu Xanh (an toàn), Vàng (sắp hết) hoặc Đỏ (vượt ngân sách) tùy mức tiêu xài của bạn.' },
          { icon: '📅', title: 'Quản lý theo tháng', desc: 'Sử dụng phím mũi tên ở trên cùng để xem lại ngân sách của các tháng trước.' },
          { icon: '🗑️', title: 'Xóa', desc: 'Nhấn vào biểu tượng thùng rác 🗑️ ở góc trên bên phải của mỗi mục để xóa ngân sách đã thiết lập.' }
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

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 0.5 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  infoBtn: { padding: 4 },
  monthNav: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 },
  monthArrow: { padding: 4 },
  monthText: { fontSize: 15, fontWeight: '500' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  overviewCard: { borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1 },
  overviewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  overviewItem: {},
  overviewLabel: { fontSize: 11, marginBottom: 3 },
  overviewVal: { fontSize: 15, fontWeight: '700' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { fontSize: 11, textAlign: 'right' },
  budgetItem: { paddingVertical: 16, borderBottomWidth: 0.5 },
  budgetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  budgetLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  budgetName: { fontSize: 15, fontWeight: '500' },
  budgetTopRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  budgetPercent: { fontSize: 14, fontWeight: '700' },
  deleteBtn: { padding: 4, marginTop: -2 },
  budgetBottom: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 },
  emptyWrap: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, fontWeight: '500' },
  fab: { position: 'absolute', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
  fabText: { fontSize: 28, color: '#fff', fontWeight: '300', marginTop: -1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '85%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D0D0D0', alignSelf: 'center', marginBottom: 12 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  amtRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  amtPrefix: { fontSize: 28, fontWeight: '700', marginRight: 6 },
  amtInput: { flex: 1, fontSize: 32, fontWeight: '700' },
  descInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  dateBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  monthPickerWrap: { borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 16, marginTop: -8 },
  yearNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: { width: '25%', paddingVertical: 12, alignItems: 'center' },
  monthCellText: { fontSize: 13, fontWeight: '500' },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  catChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, gap: 6 },
  catName: { fontSize: 13, fontWeight: '500' },
  submitBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  catModalWrap: { margin: 20, borderRadius: 20, padding: 20, marginTop: 'auto', marginBottom: 'auto' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  iconBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  catModalBtns: { flexDirection: 'row', gap: 10 },
  catModalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
});
