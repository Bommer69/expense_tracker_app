import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:3000/api';

export default function TransactionsScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [type, setType] = useState('expense');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const [transRes, catRes] = await Promise.all([
        axios.get(`${API_URL}/transactions?limit=50`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/categories`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setTransactions(transRes.data);
      setCategories(catRes.data.filter(c => c.type === type));
    } catch (err) {
      Alert.alert('Error', 'Failed to load data');
    }
  };

  const handleAddTransaction = async () => {
    if (!amount || !selectedCategory) {
      Alert.alert('Error', 'Vui lòng nhập số tiền và chọn danh mục');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      await axios.post(
        `${API_URL}/transactions`,
        {
          amount: parseFloat(amount),
          description,
          categoryId: selectedCategory._id,
          type,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setAmount('');
      setDescription('');
      setSelectedCategory(null);
      setShowForm(false);
      loadData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCategories(categories.filter(c => c.type === type));
  }, [type]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const renderTransaction = ({ item }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <Text style={styles.categoryIcon}>{item.categoryId?.icon}</Text>
        <View>
          <Text style={styles.transactionDesc}>{item.description || item.categoryId?.name}</Text>
          <Text style={styles.transactionDate}>
            {new Date(item.date).toLocaleDateString('vi-VN')}
          </Text>
        </View>
      </View>
      <Text style={[styles.transactionAmount, item.type === 'income' ? styles.income : styles.expense]}>
        {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📝 Giao dịch</Text>
      </View>

      <View style={styles.typeSelector}>
        <TouchableOpacity 
          style={[styles.typeButton, type === 'expense' && styles.typeButtonActive]} 
          onPress={() => setType('expense')}
        >
          <Text style={[styles.typeText, type === 'expense' && styles.typeTextActive]}>Chi</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.typeButton, type === 'income' && styles.typeButtonActive]} 
          onPress={() => setType('income')}
        >
          <Text style={[styles.typeText, type === 'income' && styles.typeTextActive]}>Thu</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(!showForm)}>
        <Text style={styles.addButtonText}>{showForm ? '✕ Ẩn form' : '+ Thêm giao dịch'}</Text>
      </TouchableOpacity>

      {showForm && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Số tiền"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Mô tả (để trống để AI tự phân loại)"
            value={description}
            onChangeText={setDescription}
          />
          
          <Text style={styles.label}>Danh mục:</Text>
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

          <TouchableOpacity style={styles.submitButton} onPress={handleAddTransaction} disabled={loading}>
            <Text style={styles.submitButtonText}>
              {loading ? 'Đang lưu...' : 'Lưu giao dịch'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={transactions.filter(t => t.type === type)}
        renderItem={renderTransaction}
        keyExtractor={item => item._id}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#007AFF', padding: 16, paddingTop: 48 },
  backButton: { color: '#fff', fontSize: 16, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  typeSelector: { flexDirection: 'row', padding: 12, backgroundColor: '#fff' },
  typeButton: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 8 },
  typeButtonActive: { backgroundColor: '#007AFF' },
  typeText: { fontSize: 16, color: '#666' },
  typeTextActive: { color: '#fff', fontWeight: '600' },
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
  transactionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8 },
  transactionLeft: { flexDirection: 'row', alignItems: 'center' },
  categoryIcon: { fontSize: 24, marginRight: 12 },
  transactionDesc: { fontSize: 14, fontWeight: '500' },
  transactionDate: { fontSize: 12, color: '#999' },
  transactionAmount: { fontSize: 16, fontWeight: '600' },
  income: { color: '#34C759' },
  expense: { color: '#FF3B30' },
});