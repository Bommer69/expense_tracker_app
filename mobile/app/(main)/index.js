import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MainScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userData');
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💰 Quản lý Chi tiêu</Text>
        <Text style={styles.subtitle}>Theo dõi tài chính thông minh</Text>
      </View>

      <View style={styles.grid}>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/(main)/transactions')}>
          <Text style={styles.cardIcon}>📝</Text>
          <Text style={styles.cardTitle}>Giao dịch</Text>
          <Text style={styles.cardDesc}>Thêm, xem, sửa giao dịch</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/(main)/dashboard')}>
          <Text style={styles.cardIcon}>📊</Text>
          <Text style={styles.cardTitle}>Báo cáo</Text>
          <Text style={styles.cardDesc}>Biểu đồ chi tiêu</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/(main)/budget')}>
          <Text style={styles.cardIcon}>🎯</Text>
          <Text style={styles.cardTitle}>Ngân sách</Text>
          <Text style={styles.cardDesc}>Đặt budget theo danh mục</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/(main)/chat')}>
          <Text style={styles.cardIcon}>🤖</Text>
          <Text style={styles.cardTitle}>AI Assistant</Text>
          <Text style={styles.cardDesc}>Hỏi đáp về chi tiêu</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  card: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: '1.5%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#666',
  },
  logoutButton: {
    margin: 20,
    padding: 14,
    backgroundColor: '#ff3b30',
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});