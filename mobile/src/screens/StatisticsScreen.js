import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { useTransactionSummary, useTransactions } from '../hooks/useTransactions';
import { useSavingsGoals } from '../hooks/useSavingsGoals';
import { formatCurrency, formatNumberInput, getCurrentMonth, parseFormattedNumber } from '../utils/formatters';
import { useState, useCallback } from 'react';
import { UserGuideModal } from '../components/UserGuideModal';
import DailyTrendChart from '../components/DailyTrendChart';
import { Ionicons } from '@expo/vector-icons';
import { statisticsStyles as styles } from '../styles/statisticsStyles';

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
    try {
      await Promise.all([
        fetchSummary(viewMonth), 
        fetchTransactions({ startDate, endDate, limit: 500 }),
        fetchGoals(viewMonth)
      ]);
    } catch (err) {
      console.log('Statistics loadData error:', err);
    }
  }, [viewMonth, fetchSummary, fetchTransactions, fetchGoals]);

  // Lắng nghe focus để fetch lại dữ liệu mỗi khi chuyển tab
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
            <Ionicons name="book-outline" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.monthArrow}><Ionicons name="chevron-back" size={20} color={theme.primary} /></TouchableOpacity>
          <Text style={[styles.monthText, { color: theme.text }]}>{formatMonth(viewMonth)}</Text>
          <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.monthArrow}><Ionicons name="chevron-forward" size={20} color={theme.primary} /></TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}>
        {loading && !refreshing ? <ActivityIndicator style={{ padding: 40 }} color={theme.primary} size="large" /> : (
          <>
            {/* Overview Summary */}
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border + '50' }]}>
                <View style={[styles.iconBg, { backgroundColor: theme.success + '15' }]}><Ionicons name="add-circle-outline" size={20} color={theme.success} /></View>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Thu nhập</Text>
                <Text style={[styles.summaryValue, { color: theme.success }]}>{formatCurrency(totalIncome)}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border + '50' }]}>
                <View style={[styles.iconBg, { backgroundColor: theme.error + '15' }]}><Ionicons name="remove-circle-outline" size={20} color={theme.error} /></View>
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
                <Text style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }}>📊</Text>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>Chưa có dữ liệu</Text>
                <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>Thêm giao dịch để xem thống kê danh mục</Text>
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
            <DailyTrendChart viewMonth={viewMonth} theme={theme} />
          </>
        )}
      </ScrollView>

      <UserGuideModal
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
        title="Hướng dẫn Thống kê"
        guideItems={[
          { iconName: 'calendar-outline', title: 'Bộ chọn tháng', desc: 'Dùng dấu mũi tên cạnh tên tháng để lùi/tiến xem thống kê của các tháng khác.' },
          { iconName: 'bar-chart-outline', title: 'Tổng quan & Tiết kiệm', desc: 'So sánh mức Thu và Chi, đồng thời cho biết bạn đã tiết kiệm được bao nhiêu phần trăm thu nhập.' },
          { iconName: 'pie-chart-outline', title: 'Phân tích danh mục', desc: 'Sử dụng công tắc Thu/Chi để xem phân bố tài chính. Thanh ngang hiển thị tỷ lệ tiền dùng cho từng danh mục.' },
          { iconName: 'stats-chart-outline', title: 'Xu hướng ngày', desc: 'Biểu đồ cột đôi (Thu - Xanh lá, Chi - Đỏ) thể hiện cường độ giao dịch của bạn theo từng ngày.' }
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
