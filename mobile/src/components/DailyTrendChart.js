import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { transactionsAPI } from '../api';
import { formatCurrency } from '../utils/formatters';
import { statisticsStyles as styles } from '../styles/statisticsStyles';

const MONTHS_VI = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const BAR_MAX_HEIGHT = 100;

export default function DailyTrendChart({ viewMonth, theme }) {
  const [dailyData, setDailyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [totals, setTotals] = useState({ income: 0, expense: 0, count: 0 });

  const fetchDailyData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedDay(null);
    try {
      const [yearStr, monthStr] = viewMonth.split('-');
      const yearNum = parseInt(yearStr);
      const monthNum = parseInt(monthStr);
      
      const startDate = `${viewMonth}-01`;
      const endDate = new Date(yearNum, monthNum, 1).toISOString().slice(0, 10);
      
      const response = await transactionsAPI.getAll({ 
        startDate, 
        endDate, 
        limit: 500 
      });
      
      const transactions = response.data || [];
      const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
      const data = {};
      let totalIncome = 0, totalExpense = 0;
      
      for (let i = 1; i <= daysInMonth; i++) {
        data[i] = { income: 0, expense: 0 };
      }
      
      transactions.forEach(tx => {
        if (!tx || !tx.date) return;
        const d = new Date(tx.date);
        if (isNaN(d.getTime()) || d.getFullYear() !== yearNum || d.getMonth() !== monthNum - 1) return;
        const day = d.getDate();
        if (!data[day]) return;
        if (tx.type === 'income') {
          data[day].income += tx.amount || 0;
          totalIncome += tx.amount || 0;
        } else {
          data[day].expense += tx.amount || 0;
          totalExpense += tx.amount || 0;
        }
      });
      
      setDailyData(data);
      setTotals({ income: totalIncome, expense: totalExpense, count: transactions.length });
    } catch (err) {
      console.error('DailyTrendChart fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [viewMonth]);

  useEffect(() => {
    fetchDailyData();
  }, [fetchDailyData]);

  if (loading) {
    return (
      <View style={[styles.trendCard, { backgroundColor: theme.surface, borderColor: theme.border + '50', alignItems: 'center', padding: 40 }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.trendCard, { backgroundColor: theme.surface, borderColor: theme.border + '50', alignItems: 'center', padding: 30 }]}>
        <Text style={{ fontSize: 36, marginBottom: 8 }}>⚠️</Text>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>Lỗi tải dữ liệu</Text>
        <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>{error}</Text>
      </View>
    );
  }

  const hasData = Object.values(dailyData).some(d => d.income > 0 || d.expense > 0);
  
  if (!hasData) {
    return (
      <View style={[styles.trendCard, { backgroundColor: theme.surface, borderColor: theme.border + '50' }]}>
        <View style={[styles.emptyCard, { backgroundColor: 'transparent', borderWidth: 0, paddingVertical: 40 }]}>
          <Text style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>📈</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Chưa có giao dịch</Text>
          <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>Thêm giao dịch để xem xu hướng theo ngày</Text>
        </View>
      </View>
    );
  }

  const maxBar = Math.max(...Object.values(dailyData).map(d => Math.max(d.income, d.expense)), 1);
  const entries = Object.entries(dailyData);
  
  // Lấy ngày hiện tại để highlight
  const now = new Date();
  const currentDay = now.getFullYear() === parseInt(viewMonth.split('-')[0]) && 
                     now.getMonth() === parseInt(viewMonth.split('-')[1]) - 1 
                     ? now.getDate() : -1;

  return (
    <View style={[styles.trendCard, { 
      backgroundColor: theme.surface, 
      borderColor: theme.border + '50',
      borderRadius: 20,
      padding: 20,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    }]}>
      {/* Header với tổng kết */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.border + '30',
      }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={{ fontSize: 13, color: theme.textSecondary, fontWeight: '500' }}>Thu</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: theme.success }}>{formatCurrency(totals.income)}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
            <Text style={{ fontSize: 13, color: theme.textSecondary, fontWeight: '500' }}>Chi</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: theme.error }}>{formatCurrency(totals.expense)}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>{totals.count} giao dịch</Text>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            gap: 6, 
            marginTop: 4,
            backgroundColor: totals.income - totals.expense >= 0 ? theme.success + '15' : theme.error + '15',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
          }}>
            <Text style={{ fontSize: 11, color: theme.textSecondary }}>Còn lại</Text>
            <Text style={{ 
              fontSize: 14, 
              fontWeight: '800', 
              color: totals.income - totals.expense >= 0 ? theme.success : theme.error 
            }}>
              {formatCurrency(totals.income - totals.expense)}
            </Text>
          </View>
        </View>
      </View>

      {/* Tooltip khi chọn ngày */}
      {selectedDay && (
        <View style={{
          backgroundColor: theme.text + '12',
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>
              Ngày {selectedDay}
            </Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
              {DAY_NAMES[new Date(parseInt(viewMonth.split('-')[0]), parseInt(viewMonth.split('-')[1]) - 1, selectedDay).getDay()]}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 13, color: theme.success, fontWeight: '600' }}>
              +{formatCurrency(dailyData[selectedDay]?.income || 0)}
            </Text>
            <Text style={{ fontSize: 13, color: theme.error, fontWeight: '600', marginTop: 2 }}>
              -{formatCurrency(dailyData[selectedDay]?.expense || 0)}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => setSelectedDay(null)}
            style={{ padding: 4 }}
          >
            <Text style={{ fontSize: 16, color: theme.textSecondary, opacity: 0.5 }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Biểu đồ */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'flex-end', 
          height: BAR_MAX_HEIGHT + 30,
          gap: 3,
          paddingHorizontal: 4,
        }}>
          {entries.map(([day, data]) => {
            const hasIncome = data.income > 0;
            const hasExpense = data.expense > 0;
            const hasVal = hasIncome || hasExpense;
            const incomeHeight = hasIncome ? Math.max((data.income / maxBar) * BAR_MAX_HEIGHT, 6) : 0;
            const expenseHeight = hasExpense ? Math.max((data.expense / maxBar) * BAR_MAX_HEIGHT, 6) : 0;
            const isToday = parseInt(day) === currentDay;
            const isSelected = parseInt(day) === selectedDay;
            
            return (
              <TouchableOpacity
                key={day}
                activeOpacity={0.7}
                onPress={() => {
                  if (hasVal) {
                    setSelectedDay(selectedDay === parseInt(day) ? null : parseInt(day));
                  }
                }}
                style={{ 
                  alignItems: 'center', 
                  width: 32,
                  paddingTop: 4,
                }}
              >
                {/* Giá trị trên cột (khi có dữ liệu) */}
                {hasVal && (
                  <Text style={{
                    fontSize: 8,
                    fontWeight: '700',
                    color: theme.textSecondary,
                    opacity: 0.5,
                    marginBottom: 2,
                  }}>
                    {formatCurrency(data.income + data.expense).length > 6 
                      ? Math.round((data.income + data.expense) / 1000) + 'k' 
                      : formatCurrency(data.income + data.expense)}
                  </Text>
                )}
                
                {/* Cột thu nhập */}
                <View style={{ 
                  flexDirection: 'row', 
                  gap: 2, 
                  alignItems: 'flex-end',
                  height: BAR_MAX_HEIGHT,
                }}>
                  {hasIncome && (
                    <View style={{
                      width: 11,
                      height: incomeHeight,
                      backgroundColor: theme.success + (isSelected ? 'dd' : '99'),
                      borderTopLeftRadius: 4,
                      borderTopRightRadius: 4,
                    }} />
                  )}
                  {hasExpense && (
                    <View style={{
                      width: 11,
                      height: expenseHeight,
                      backgroundColor: theme.error + (isSelected ? 'dd' : '99'),
                      borderTopLeftRadius: 4,
                      borderTopRightRadius: 4,
                    }} />
                  )}
                  {!hasIncome && !hasExpense && (
                    <View style={{ width: 24, height: 2, backgroundColor: theme.border + '30', borderRadius: 1 }} />
                  )}
                </View>
                
                {/* Nhãn ngày */}
                <View style={{
                  marginTop: 6,
                  width: 28,
                  height: 22,
                  borderRadius: 6,
                  backgroundColor: isToday ? theme.primary + '20' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: isToday ? 1 : 0,
                  borderColor: theme.primary + '40',
                }}>
                  <Text style={{ 
                    fontSize: 10, 
                    fontWeight: isToday ? '700' : '500',
                    color: isToday ? theme.primary : theme.textSecondary,
                  }}>
                    {day}
                  </Text>
                </View>
                
                {/* Chấm tròn dưới ngày được chọn */}
                {isSelected && (
                  <View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.primary,
                    marginTop: 3,
                  }} />
                )}
              </TouchableOpacity>
            );
          })}
          <View style={{ width: 10 }} />
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: theme.border + '30',
      }}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.success, width: 10, height: 10, borderRadius: 3 }]} />
          <Text style={[styles.legendText, { fontSize: 13, fontWeight: '500' }]}>Thu nhập</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.error, width: 10, height: 10, borderRadius: 3 }]} />
          <Text style={[styles.legendText, { fontSize: 13, fontWeight: '500' }]}>Chi tiêu</Text>
        </View>
        {currentDay > 0 && (
          <View style={styles.legendItem}>
            <View style={{ width: 10, height: 10, borderRadius: 3, borderWidth: 1.5, borderColor: theme.primary }} />
            <Text style={[styles.legendText, { fontSize: 13, fontWeight: '500' }]}>Hôm nay</Text>
          </View>
        )}
      </View>
    </View>
  );
}
