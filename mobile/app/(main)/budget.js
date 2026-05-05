import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:3000/api';

export default function BudgetScreen() {
  const router = useRouter();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      const [budgetRes, catRes] = await Promise.all([
        axios.get(`${API_URL}/budgets?month=${currentMonth}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/categories?type=expense`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      
      setBudgets(budgetRes.data);
      setCategories(catRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateBudget = async () => {
    if (!selectedCategory || !amount) {
      Alert.alert('Error', 'Vui lòng chọn danh mục và nhập số tiền');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      await axios.post(
        `${API_URL}/budgets`,
        { categoryId: selectedCategory._id, amount: parseFloat(amount), month: currentMonth },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setAmount('');
      setSelectedCategory(null);
      setShowForm(false);
      loadData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create budget');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const renderBudget = ({ item }) => {
    const percent = item.amount > 0 ? Math.round((item.spent / item.amount) * 100) : 0;
    const status = percent >= 100 ? 'exceeded' : percent >= 80 ? 'warning' : 'good';
    
    return (
      <View style={styles.budgetItem}>
        <View style={styles.budgetHeader}>
          <Text style={styles.categoryIcon}>{item.categoryId?.icon}</Text>
          <Text style={styles.categoryName}>{item.categoryId?.name}</Text>
        </View>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(percent, 100)}%` }, status === 'exceeded' && styles.exceededFill, status === 'warning' && styles.warningFill]} />
          </View>
          <Text style={styles.budgetText}>{formatCurrency(item.spent)} / {formatCurrency(item.amount)} ({percent}%)</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🎯 Ngân sách</Text>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(!showForm)}>
        <Text style={styles.addButtonText}>{showForm ? '✕ Ẩn form' : '+ Đặt ngân sách'}</Text>
      </TouchableOpacity>

      {showForm && (
        <View style={styles.form}>
          <Text style={styles.label}>Chọn danh mục:</Text>
          <View style={styles.categoryGrid}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat._id}
                style={[styles.categoryChip, selectedCategory?._id === cat._id && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text>{cat.icon} {cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TextInput
            style={styles.input}
            placeholder="Số tiền ngân sách"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
          
          <TouchableOpacity style={styles.submitButton} onPress={handleCreateBudget} disabled={loading}>
            <Text style={styles.submitButtonText}>{loading ? 'Đang lưu...' : 'Lưu ngân sách'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={budgets}
        renderItem={renderBudget}
        keyExtractor={item => item._id}
        style={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>Chưa có ngân sách nào. Hãy đặt ngân sách cho danh mục!</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#007AFF', padding: 16, paddingTop: 48 },
  backButton: { color: '#fff', fontSize: 16, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  addButton: { margin: 12, padding: 14, backgroundColor: '#34C759', borderRadius: 8, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  form: { backgroundColor: '#fff', margin: 12, padding: 16, borderRadius: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  categoryChip: { padding: 8, backgroundColor: '#f0f0f0', borderRadius: 16, margin: 4 },
  categoryChipActive: { backgroundColor: '#007AFF' },
  submitButton: { backgroundColor: '#007AFF', padding: 14, borderRadius: 8, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  list: { flex: 1, padding: 12 },
  budgetItem: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  categoryIcon: { fontSize: 24, marginRight: 8 },
  categoryName: { fontSize: 16, fontWeight: '600' },
  progressContainer: { marginTop: 4 },
  progressBar: { height: 8, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#34C759', borderRadius: 4 },
  exceededFill: { backgroundColor: '#FF3B30' },
  warningFill: { backgroundColor: '#FF9500' },
  budgetText: { fontSize: 12, color: '#666', marginTop: 4 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 24 },
});