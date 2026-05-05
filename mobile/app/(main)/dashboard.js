import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:3000/api';
const screenWidth = Dimensions.get('window').width;

const COLORS = ['#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#FF9933', '#33FF99', '#FF3366', '#33CCFF'];

export default function DashboardScreen() {
  const [stats, setStats] = useState({ totalIncome: 0, totalExpense: 0, transactionCount: 0, avgDailyExpense: 0 });
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, byCategory: {} });
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      const [statsRes, summaryRes] = await Promise.all([
        axios.get(`${API_URL}/ai/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/transactions/summary?month=${currentMonth}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      
      setStats(statsRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // Prepare chart data
  const categoryData = Object.entries(summary.byCategory)
    .filter(([_, data]) => data.expense > 0)
    .map(([name, data], index) => ({
      name,
      expense: data.expense,
      color: COLORS[index % COLORS.length],
    }));

  const totalExpense = categoryData.reduce((sum, item) => sum + item.expense, 0);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.backButton} onPress={() => router.back()}>← Quay lại</Text>
        <Text style={styles.title}>📊 Báo cáo</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, styles.incomeCard]}>
          <Text style={styles.summaryLabel}>Thu nhập</Text>
          <Text style={styles.summaryValue}>{formatCurrency(stats.totalIncome)}</Text>
        </View>
        <View style={[styles.summaryCard, styles.expenseCard]}>
          <Text style={styles.summaryLabel}>Chi tiêu</Text>
          <Text style={styles.summaryValue}>{formatCurrency(stats.totalExpense)}</Text>
        </View>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Số dư tháng này</Text>
        <Text style={[styles.balanceValue, stats.totalIncome - stats.totalExpense < 0 && styles.negative]}>
          {formatCurrency(stats.totalIncome - stats.totalExpense)}
        </Text>
        <Text style={styles.avgText}>Trung bình {formatCurrency(stats.avgDailyExpense)}/ngày</Text>
      </View>

      {/* Pie Chart - Simple View-based */}
      {categoryData.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Chi tiêu theo danh mục</Text>
          
          {/* Simple bar chart */}
          <View style={styles.chartContainer}>
            {categoryData.map((item, index) => (
              <View key={item.name} style={styles.chartRow}>
                <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
                <Text style={styles.categoryName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.categoryPercent}>
                  {totalExpense > 0 ? Math.round(item.expense / totalExpense * 100) : 0}%
                </Text>
                <View style={styles.barContainer}>
                  <View 
                    style={[
                      styles.bar, 
                      { 
                        width: `${totalExpense > 0 ? (item.expense / totalExpense * 100) : 0}%`,
                        backgroundColor: item.color 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.categoryAmount}>{formatCurrency(item.expense)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Category Breakdown */}
      <View style={styles.categoryCard}>
        <Text style={styles.chartTitle}>Chi tiết theo danh mục</Text>
        {categoryData.map((item) => (
          <View key={item.name} style={styles.categoryRow}>
            <View style={styles.categoryInfo}>
              <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
              <Text style={styles.categoryName}>{item.name}</Text>
            </View>
            <Text style={styles.categoryAmount}>{formatCurrency(item.expense)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#007AFF', padding: 16, paddingTop: 48 },
  backButton: { color: '#fff', fontSize: 16, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  summaryContainer: { flexDirection: 'row', padding: 12 },
  summaryCard: { flex: 1, padding: 16, borderRadius: 12, marginHorizontal: 4 },
  incomeCard: { backgroundColor: '#34C759' },
  expenseCard: { backgroundColor: '#FF3B30' },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  summaryValue: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  balanceCard: { backgroundColor: '#fff', margin: 12, padding: 20, borderRadius: 12 },
  balanceLabel: { fontSize: 14, color: '#666' },
  balanceValue: { fontSize: 28, fontWeight: 'bold', color: '#34C759', marginTop: 4 },
  negative: { color: '#FF3B30' },
  avgText: { fontSize: 12, color: '#999', marginTop: 8 },
  chartCard: { backgroundColor: '#fff', margin: 12, padding: 16, borderRadius: 12 },
  chartTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  chartContainer: {},
  chartRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  categoryDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  categoryName: { flex: 1, fontSize: 14, marginRight: 8 },
  categoryPercent: { fontSize: 12, color: '#666', width: 35, textAlign: 'right' },
  barContainer: { width: 80, height: 8, backgroundColor: '#eee', borderRadius: 4, marginHorizontal: 8, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 4 },
  categoryAmount: { fontSize: 14, fontWeight: '600', minWidth: 80, textAlign: 'right' },
  categoryCard: { backgroundColor: '#fff', margin: 12, padding: 16, borderRadius: 12, marginBottom: 24 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  categoryInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
});