import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useTransactionSummary, useTransactions } from '../../src/hooks/useTransactions';
import { useSavingsGoals } from '../../src/hooks/useSavingsGoals';
import { formatCurrency, formatNumberInput, getCurrentMonth, parseFormattedNumber } from '../../src/utils/formatters';
import { useState, useCallback } from 'react';
import { UserGuideModal } from '../../src/components/UserGuideModal';

const COLORS = ['#6C5CE7', '#00B894', '#FF6B6B', '#FDCB6E', '#00CECE', '#E17055', '#A29BFE', '#55EFC4', '#FF9FF3', '#54A0FF'];
const MONTHS_VI = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

export default function StatisticsScreen() {
  const { theme } = useTheme();
  const [viewMonth, setViewMonth] = useState(getCurrentMonth());
  const { summary, loading: sL, fetchSummary } = useTransactionSummary();
  const { transactions, loading: tL, fetchTransactions } = useTransactions(200);
  const { goals, loading: gL, fetchGoals, saveGoal } = useSavingsGoals();
  
  const [refreshing, setRefreshing] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);
  const [chartType, setChartType] = useState('expense'); // 'expense' or 'income'
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalAmount, setGoalAmount] = useState('');
  const [goalNote, setGoalNote] = useState('');
  
  const loading = sL || tL || gL;

  const loadData = useCallback(async () => {
    const startDate = `${viewMonth}-01`;
    const endDate = new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1)).toISOString().slice(0, 10);
    await Promise.all([
      fetchSummary(viewMonth), 
      fetchTransactions({ startDate, endDate }),
      fetchGoals(viewMonth)
    ]);
  }, [viewMonth, fetchSummary, fetchTransactions, fetchGoals]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => { 
    setRefreshing(true); 
    await loadData(); 
    setRefreshing(false); 
  };

  const navigateMonth = (dir) => {
    const [y, m] = viewMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const formatMonth = (m) => {
    const [y, mo] = m.split('-');
    return `${MONTHS_VI[parseInt(mo) - 1]} ${y}`;
  };

  const totalExpense = summary.totalExpense || 0;
  const totalIncome = summary.totalIncome || 0;
  const savings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((savings / totalIncome) * 100).toFixed(0) : 0;
  const activeGoal = goals[0] || null;
  const goalProgress = activeGoal?.progress;

  // Prepare Donut Chart Data based on selected type
  const catDataRaw = Object.entries(summary.byCategory || {}).filter(([_, v]) => v[chartType] > 0);
  const totalChartVal = chartType === 'expense' ? totalExpense : totalIncome;
  const catData = catDataRaw.sort(([, a], [, b]) => b[chartType] - a[chartType]).map(([name, val], i) => ({ 
    name, 
    amount: val[chartType], 
    color: COLORS[i % COLORS.length] 
  }));

  // Prepare Daily Trend Data
  const dailyData = {};
  const daysInMonth = new Date(viewMonth.split('-')[0], viewMonth.split('-')[1], 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) dailyData[i] = { income: 0, expense: 0 };
  
  transactions.forEach(tx => { 
    const d = new Date(tx.date).getDate(); 
    if (tx.type === 'income') dailyData[d].income += tx.amount; 
    else dailyData[d].expense += tx.amount; 
  });
  const maxBar = Math.max(...Object.values(dailyData).map(d => Math.max(d.income, d.expense)), 1);

  const handleSaveGoal = async () => {
    const parsed = parseFormattedNumber(goalAmount);
    if (!parsed || parsed <= 0) {
      Alert.alert('Lỗi', 'Nhập mục tiêu tiết kiệm hợp lệ');
      return;
    }
    try {
      await saveGoal({ month: viewMonth, targetAmount: parsed, note: goalNote });
      setGoalModalVisible(false);
    } catch {
      Alert.alert('Lỗi', 'Không thể lưu mục tiêu tiết kiệm');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with Month Nav */}
      <View style={[styles.header, { borderBottomColor: theme.border + '40' }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Thống kê</Text>
          <TouchableOpacity onPress={() => setGuideVisible(true)} style={styles.infoBtn}>
            <Text style={{ fontSize: 22 }}>ℹ️</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.monthArrow}><Text style={{ color: theme.primary, fontSize: 20 }}>‹</Text></TouchableOpacity>
          <Text style={[styles.monthText, { color: theme.text }]}>{formatMonth(viewMonth)}</Text>
          <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.monthArrow}><Text style={{ color: theme.primary, fontSize: 20 }}>›</Text></TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}>
        {loading && !refreshing ? <ActivityIndicator style={{ padding: 40 }} color={theme.primary} size="large" /> : (
          <>
            {/* Overview Summary */}
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border + '50' }]}>
                <View style={[styles.iconBg, { backgroundColor: theme.success + '15' }]}><Text style={styles.summaryIcon}>📈</Text></View>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Thu nhập</Text>
                <Text style={[styles.summaryValue, { color: theme.success }]}>{formatCurrency(totalIncome)}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border + '50' }]}>
                <View style={[styles.iconBg, { backgroundColor: theme.error + '15' }]}><Text style={styles.summaryIcon}>📉</Text></View>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Chi tiêu</Text>
                <Text style={[styles.summaryValue, { color: theme.error }]}>{formatCurrency(totalExpense)}</Text>
              </View>
            </View>

            <View style={[styles.savingsCard, { backgroundColor: theme.surface, borderColor: theme.border + '60' }]}>
              <View style={styles.savingsTop}>
                <View>
                  <Text style={[styles.savingsLabel, { color: theme.textSecondary }]}>Tiết kiệm tháng này</Text>
                  <Text style={[styles.savingsAmount, { color: savings >= 0 ? theme.success : theme.error }]}>{savings >= 0 ? '+' : ''}{formatCurrency(savings)}</Text>
                </View>
                <Text style={[styles.savingsRateText, { color: savings >= 0 ? theme.success : theme.error }]}>{savingsRate}%</Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: theme.border + '50' }]}>
                <View style={[styles.progressFill, { backgroundColor: savings >= 0 ? theme.success : theme.error, width: `${Math.min(Math.abs(Number(savingsRate)), 100)}%` }]} />
              </View>
            </View>

            <View style={[styles.goalCard, { backgroundColor: theme.surface, borderColor: theme.border + '60' }]}>
              <View style={styles.goalHeader}>
                <Text style={[styles.goalTitle, { color: theme.text }]}>Mục tiêu tiết kiệm</Text>
                <TouchableOpacity
                  onPress={() => {
                    setGoalAmount(activeGoal?.targetAmount ? formatNumberInput(String(activeGoal.targetAmount)) : '');
                    setGoalNote(activeGoal?.note || '');
                    setGoalModalVisible(true);
                  }}
                >
                  <Text style={{ color: theme.primary, fontWeight: '600' }}>
                    {activeGoal ? 'Chỉnh sửa' : 'Thiết lập'}
                  </Text>
                </TouchableOpacity>
              </View>
              {!activeGoal ? (
                <Text style={{ color: theme.textSecondary }}>Chưa có mục tiêu cho tháng này.</Text>
              ) : (
                <>
                  <Text style={{ color: theme.textSecondary, marginBottom: 4 }}>
                    Mục tiêu: {formatCurrency(goalProgress?.targetAmount || 0)}
                  </Text>
                  <Text style={{ color: theme.textSecondary, marginBottom: 10 }}>
                    Đã tiết kiệm: {formatCurrency(goalProgress?.savedAmount || 0)}
                  </Text>
                  <View style={[styles.progressBar, { backgroundColor: theme.border + '50' }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: goalProgress?.status === 'behind' ? theme.warning : theme.success,
                          width: `${Math.min(Math.max(goalProgress?.progressPercent || 0, 0), 100)}%`
                        }
                      ]}
                    />
                  </View>
                  <Text
                    style={{
                      marginTop: 8,
                      color: goalProgress?.status === 'behind' ? theme.warning : theme.textSecondary,
                      fontSize: 12,
                      fontWeight: '600'
                    }}
                  >
                    {goalProgress?.status === 'behind'
                      ? 'Cảnh báo: Bạn đang lệch mục tiêu tiết kiệm tháng này.'
                      : `Tiến độ: ${goalProgress?.progressPercent || 0}%`}
                  </Text>
                </>
              )}
            </View>

            {/* Category Chart Section */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Danh mục phân bổ</Text>
              <View style={[styles.typeToggle, { backgroundColor: theme.surface, borderColor: theme.border + '50' }]}>
                <TouchableOpacity style={[styles.typeBtn, chartType === 'income' && { backgroundColor: theme.success }]} onPress={() => setChartType('income')}>
                  <Text style={[styles.typeText, { color: chartType === 'income' ? '#fff' : theme.textSecondary }]}>Thu</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.typeBtn, chartType === 'expense' && { backgroundColor: theme.error }]} onPress={() => setChartType('expense')}>
                  <Text style={[styles.typeText, { color: chartType === 'expense' ? '#fff' : theme.textSecondary }]}>Chi</Text>
                </TouchableOpacity>
              </View>
            </View>

            {catData.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border + '40' }]}>
                <Text style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>📊</Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Chưa có dữ liệu</Text>
              </View>
            ) : (
              <View style={[styles.chartCard, { backgroundColor: theme.surface, borderColor: theme.border + '50' }]}>
                <View style={styles.donutRing}>
                  {catData.map(c => <View key={c.name} style={[styles.donutSegment, { backgroundColor: c.color, width: `${Math.max(totalChartVal > 0 ? (c.amount / totalChartVal * 100) : 0, 8)}%` }]} />)}
                </View>
                {catData.map((c, idx) => {
                  const pct = totalChartVal > 0 ? (c.amount / totalChartVal * 100).toFixed(1) : 0;
                  return (
                    <View key={c.name} style={[styles.catItem, idx < catData.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: theme.border + '50' }]}>
                      <View style={styles.catLeft}>
                         <View style={[styles.catDot, { backgroundColor: c.color }]} />
                        <Text style={[styles.catName, { color: theme.text }]}>{c.name}</Text>
                      </View>
                      <View style={styles.catRight}>
                        <Text style={[styles.catAmount, { color: theme.text }]}>{formatCurrency(c.amount)}</Text>
                        <Text style={[styles.catPercent, { color: theme.textSecondary }]}>{pct}%</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Daily Trend Chart Section */}
            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 10 }]}>Xu hướng ngày</Text>
            <View style={[styles.trendCard, { backgroundColor: theme.surface, borderColor: theme.border + '50' }]}>
              {transactions.length === 0 ? <Text style={[styles.emptyText, { color: theme.textSecondary, padding: 20 }]}>Chưa có dữ liệu giao dịch</Text> : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.barChart}>
                    {Object.entries(dailyData).map(([day, data]) => {
                      const hasData = data.income > 0 || data.expense > 0;
                      return (
                        <View key={day} style={styles.barGroup}>
                          <View style={styles.barContainer}>
                            <View style={styles.barDualWrap}>
                              <View style={[styles.bar, { backgroundColor: theme.success + '90', height: Math.max((data.income / maxBar) * 80, hasData ? 4 : 0) }]} />
                              <View style={[styles.bar, { backgroundColor: theme.error + '90', height: Math.max((data.expense / maxBar) * 80, hasData ? 4 : 0) }]} />
                            </View>
                          </View>
                          <Text style={[styles.barLabel, { color: theme.textSecondary }]}>{day}</Text>
                        </View>
                      );
                    })}
                    <View style={{ width: 10 }} />
                  </View>
                </ScrollView>
              )}
              <View style={styles.legendRow}>
                 <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: theme.success }]} /><Text style={styles.legendText}>Thu</Text></View>
                 <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: theme.error }]} /><Text style={styles.legendText}>Chi</Text></View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <UserGuideModal
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
        title="Hướng dẫn Thống kê"
        guideItems={[
          { icon: '📅', title: 'Bộ chọn tháng', desc: 'Dùng dấu mũi tên cạnh tên tháng để lùi/tiến xem thống kê của các tháng khác.' },
          { icon: '📊', title: 'Tổng quan & Tiết kiệm', desc: 'So sánh mức Thu và Chi, đồng thời cho biết bạn đã tiết kiệm được bao nhiêu phần trăm thu nhập.' },
          { icon: '🍩', title: 'Phân tích danh mục', desc: 'Sử dụng công tắc Thu/Chi để xem phân bố tài chính. Thanh ngang hiển thị tỷ lệ tiền dùng cho từng danh mục.' },
          { icon: '📉', title: 'Xu hướng ngày', desc: 'Biểu đồ cột đôi (Thu - Xanh lá, Chi - Đỏ) thể hiện cường độ giao dịch của bạn theo từng ngày.' }
        ]}
      />

      <Modal visible={goalModalVisible} transparent animationType="fade" onRequestClose={() => setGoalModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.goalModal, { backgroundColor: theme.background }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Mục tiêu tiết kiệm tháng</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: theme.border, color: theme.text }]}
              placeholder="Số tiền mục tiêu (VND)"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              value={goalAmount}
              onChangeText={(text) => setGoalAmount(formatNumberInput(text))}
            />
            <TextInput
              style={[styles.modalInput, { borderColor: theme.border, color: theme.text }]}
              placeholder="Ghi chú (tùy chọn)"
              placeholderTextColor={theme.textSecondary}
              value={goalNote}
              onChangeText={setGoalNote}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: theme.border }]} onPress={() => setGoalModalVisible(false)}>
                <Text style={{ color: theme.textSecondary }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={handleSaveGoal}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 0.5 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  infoBtn: { padding: 4 },
  monthNav: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 },
  monthArrow: { padding: 4 },
  monthText: { fontSize: 15, fontWeight: '500' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  summaryCard: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1 },
  iconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  summaryIcon: { fontSize: 20 },
  summaryLabel: { fontSize: 13, marginBottom: 4, fontWeight: '500' },
  summaryValue: { fontSize: 18, fontWeight: '700' },
  savingsCard: { padding: 20, borderRadius: 16, marginBottom: 24, borderWidth: 1 },
  goalCard: { padding: 20, borderRadius: 16, marginBottom: 24, borderWidth: 1 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  goalTitle: { fontSize: 16, fontWeight: '700' },
  savingsTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  savingsLabel: { fontSize: 13, marginBottom: 4, fontWeight: '500' },
  savingsAmount: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  savingsRateText: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  typeToggle: { flexDirection: 'row', borderRadius: 8, borderWidth: 1, overflow: 'hidden' },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  typeText: { fontSize: 12, fontWeight: '600' },
  chartCard: { borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1 },
  donutRing: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', width: '100%', marginBottom: 20 },
  donutSegment: { height: '100%' },
  catItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catName: { fontSize: 14, fontWeight: '500' },
  catRight: { alignItems: 'flex-end' },
  catAmount: { fontSize: 14, fontWeight: '600' },
  catPercent: { fontSize: 12, marginTop: 2 },
  trendCard: { borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 4 },
  barGroup: { alignItems: 'center', width: 28 },
  barContainer: { height: 80, justifyContent: 'flex-end' },
  barDualWrap: { flexDirection: 'row', gap: 2, alignItems: 'flex-end' },
  bar: { width: 10, borderRadius: 3 },
  barLabel: { fontSize: 10, marginTop: 6, fontWeight: '500' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 16, borderTopWidth: 0.5, borderColor: '#ccc', paddingTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#888' },
  emptyCard: { borderRadius: 16, padding: 30, alignItems: 'center', marginBottom: 24, borderWidth: 1 },
  emptyText: { fontSize: 14, fontWeight: '500' },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.35)' },
  goalModal: { borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
});
