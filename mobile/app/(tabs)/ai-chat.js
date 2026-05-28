import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { useState, useRef, useEffect } from 'react';
import { aiAPI } from '../../src/api';
import { UserGuideModal } from '../../src/components/UserGuideModal';
import { Ionicons } from '@expo/vector-icons';
import { getErrorMessage } from '../../src/utils/errorHandler';
import { aiChatStyles as styles } from '../../src/styles/aiChatStyles';

const QUICK_PROMPTS = [
  { iconName: 'wallet', text: 'Tôi chi tiêu thế nào tháng này?' },
  { iconName: 'bulb', text: 'Cho tôi lời khuyên tiết kiệm' },
  { iconName: 'bar-chart', text: 'Phân tích thói quen của tôi' },
  { iconName: 'target', text: 'Tôi có vượt ngân sách không?' },
];

const WELCOME_MSG = {
  id: 'welcome',
  role: 'ai',
  text: 'Xin chào! Tôi là trợ lý AI quản lý chi tiêu của bạn.\n\nHãy hỏi tôi bất cứ điều gì về tài chính cá nhân.',
  time: new Date(),
};

export default function AIChatScreen() {
  const { theme } = useTheme();
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [guideVisible, setGuideVisible] = useState(false);
  const flatListRef = useRef(null);
  const [clearing, setClearing] = useState(false);

  // Load lịch sử hội thoại từ server khi mở màn hình
  useEffect(() => {
    (async () => {
      try {
        const res = await aiAPI.getHistory();
        const history = res.data.messages;
        if (history.length > 0) {
          setMessages(history.map(m => ({
            id: String(m.id),
            role: m.role === 'model' ? 'ai' : 'user',
            text: m.text,
            time: new Date(m.time),
          })));
        }
      } catch {
        // Không load được lịch sử → giữ welcome message
      } finally {
        setLoadingHistory(false);
      }
    })();
  }, []);

  const clearChat = async () => {
    if (clearing) return;
    setClearing(true);
    try {
      await aiAPI.clearHistory();
    } catch {
      // Best-effort — clear local messages regardless of API result
    } finally {
      setClearing(false);
    }
    setMessages([{
      id: 'welcome',
      role: 'ai',
      text: 'Xin chào! Tôi là trợ lý AI quản lý chi tiêu của bạn.\n\nHãy hỏi tôi bất cứ điều gì về tài chính cá nhân.',
      time: new Date(),
    }]);
  };

  const sendMessage = async (text) => {
    const messageText = text || inputText.trim();
    if (!messageText || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText,
      time: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const response = await aiAPI.chat(messageText);
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: response.data.answer,
        time: new Date(),
        context: response.data.context,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: getErrorMessage(err) || 'Không thể kết nối AI. Vui lòng thử lại.',
        time: new Date(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAI]}>
        {!isUser && (
          <View style={[styles.avatarAI, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name="chatbubble" size={14} color={theme.primary} />
          </View>
        )}
        <View style={[
          styles.msgBubble,
          isUser ? [styles.msgBubbleUser, { backgroundColor: theme.primary }] : [styles.msgBubbleAI, { backgroundColor: theme.surface, borderColor: theme.border + '50', borderWidth: 1 }],
          item.isError && { backgroundColor: theme.error + '10', borderColor: theme.error + '40' }
        ]}>
          <Text style={[styles.msgText, isUser ? { color: '#FFF' } : { color: theme.text }, item.isError && { color: theme.error }]}>
            {item.text}
          </Text>
          <Text style={[styles.msgTime, isUser ? { color: '#FFFFFF80' } : { color: theme.textSecondary }]}>
            {item.time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {isUser && (
          <View style={[styles.avatarUser, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name="person" size={14} color={theme.primary} />
          </View>
        )}
      </View>
    );
  };

  if (loadingHistory) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Đang tải lịch sử...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Minimal Header */}
      <View style={[styles.header, { borderBottomColor: theme.border + '40' }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Trợ lý AI</Text>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Chatbot</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={clearChat} style={styles.infoBtn} disabled={clearing}>
              <Ionicons name="trash-outline" size={22} color={clearing ? theme.textSecondary : theme.error} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setGuideVisible(true)} style={styles.infoBtn}>
              <Ionicons name="book-outline" size={24} color="#6B7194" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.chatArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loading ? (
              <View style={[styles.msgRow, styles.msgRowAI]}>
                <View style={[styles.avatarAI, { backgroundColor: theme.primary + '15' }]}>
                  <Ionicons name="chatbubble" size={14} color={theme.primary} />
                </View>
                <View style={[styles.typingBubble, { backgroundColor: theme.surface, borderColor: theme.border + '50', borderWidth: 1 }]}>
                  <ActivityIndicator size="small" color={theme.textSecondary} />
                  <Text style={[styles.typingText, { color: theme.textSecondary }]}>Đang suy nghĩ...</Text>
                </View>
              </View>
            ) : null
          }
        />

        {messages.length <= 1 && (
          <View style={styles.quickPrompts}>
            {QUICK_PROMPTS.map((prompt, i) => (
              <TouchableOpacity key={i} style={[styles.quickBtn, { backgroundColor: theme.surface, borderColor: theme.border + '60' }]} onPress={() => sendMessage(prompt.text)}>
                <Ionicons name={prompt.iconName} size={16} color={theme.primary} style={styles.quickIcon} />
                <Text style={[styles.quickText, { color: theme.text }]} numberOfLines={1}>{prompt.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={[styles.inputArea, { backgroundColor: theme.background, borderTopColor: theme.border + '40' }]}>
          <TextInput
            style={[styles.textInput, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border + '50' }]}
            placeholder="Hỏi AI bất cứ điều gì..."
            placeholderTextColor={theme.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!loading}
          />
          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: theme.primary }, (!inputText.trim() || loading) && { opacity: 0.5 }]} onPress={() => sendMessage()} disabled={!inputText.trim() || loading}>
            <Ionicons name="send" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <UserGuideModal
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
        title="Hướng dẫn AI Chat"
        guideItems={[
          { iconName: 'chatbubbles', title: 'Hỏi đáp AI', desc: 'Sử dụng công nghệ Google Gemini để phân tích dữ liệu tài chính thực tế của bạn.' },
          { iconName: 'bulb', title: 'Gợi ý câu hỏi', desc: 'Bạn có thể ấn vào các nút gợi ý nếu không biết bắt đầu từ đâu.' },
          { iconName: 'lock-closed', title: 'Quyền riêng tư', desc: 'Chỉ các số liệu tóm tắt (không chứa thông tin nhạy cảm) mới được gửi cho AI phân tích.' }
        ]}
      />
    </View>
  );
}

