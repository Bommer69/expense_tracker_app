import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:3000/api';

export default function ChatScreen() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Xin chào! Tôi là AI Assistant quản lý chi tiêu. Bạn có thể hỏi tôi về:\n- Tổng chi tiêu tháng này\n- Danh mục nào chiếm nhiều nhất\n- Xu hướng chi tiêu\n- Cách tiết kiệm\n\nHãy hỏi nhé!' }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;

    const userMsg = { role: 'user', content: message };
    setMessages(prev => [...prev, userMsg]);
    setMessage('');
    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.post(
        `${API_URL}/ai/chat`,
        { message },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.answer }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.' }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }) => (
    <View style={[styles.messageBubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
      <Text style={styles.messageText}>{item.content}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.backButton} onPress={() => router.back()}>← Quay lại</Text>
        <Text style={styles.title}>🤖 AI Assistant</Text>
      </View>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(_, index) => index.toString()}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Hỏi về chi tiêu của bạn..."
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendButton, loading && styles.sendButtonDisabled]} 
          onPress={handleSend}
          disabled={loading}
        >
          <Text style={styles.sendButtonText}>{loading ? '...' : '➤'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#007AFF', padding: 16, paddingTop: 48 },
  backButton: { color: '#fff', fontSize: 16, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  messageList: { flex: 1 },
  messageListContent: { padding: 12 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#007AFF' },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#fff' },
  messageText: { fontSize: 14, color: '#333' },
  inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#ddd' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 80 },
  sendButton: { backgroundColor: '#007AFF', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendButtonDisabled: { backgroundColor: '#999' },
  sendButtonText: { color: '#fff', fontSize: 20 },
});