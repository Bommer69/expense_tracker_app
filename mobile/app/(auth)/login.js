import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  Animated, Dimensions, StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(null);
  const { login, register } = useAuth();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const formSlide = useRef(new Animated.Value(50)).current;
  const switchAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkOnboarding();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
      Animated.timing(formSlide, { toValue: 0, duration: 700, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const checkOnboarding = async () => {
    const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');
    setShowOnboarding(hasOnboarded !== 'true');
  };

  useEffect(() => {
    Animated.spring(switchAnim, { toValue: isLogin ? 0 : 1, friction: 6, tension: 80, useNativeDriver: true }).start();
  }, [isLogin]);

  const validateInputs = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập email'); return false; }
    if (!emailRegex.test(email.trim())) { Alert.alert('Lỗi', 'Email không hợp lệ'); return false; }
    if (!password) { Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu'); return false; }
    if (password.length < 6) { Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự'); return false; }
    if (!isLogin) {
      if (!name.trim() || name.trim().length < 2) { Alert.alert('Lỗi', 'Họ tên phải có ít nhất 2 ký tự'); return false; }
      if (password !== confirmPassword) { Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp'); return false; }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateInputs()) return;
    setLoading(true);
    try {
      if (isLogin) { await login(email.trim(), password); }
      else { await register(email.trim(), password, name.trim()); }
      router.replace('/(tabs)');
    } catch (err) {
      const msg =
        err?.error ||
        err?.message ||
        err?.response?.data?.error ||
        'Đã xảy ra lỗi. Vui lòng thử lại.';
      Alert.alert('Lỗi', msg);
    } finally { setLoading(false); }
  };

  const handleSkipOnboarding = async () => {
    await AsyncStorage.setItem('hasOnboarded', 'true');
    setShowOnboarding(false);
  };

  if (showOnboarding === null) return <View style={styles.container} />;
  if (showOnboarding) return <OnboardingInline onFinish={handleSkipOnboarding} />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      <View style={styles.bgCircle3} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ scale: logoScale }] }]}>
            <View style={styles.logoContainer}>
              <Ionicons name="wallet" size={56} color="#6C5CE7" />
            </View>
            <Text style={styles.appName}>Expense Tracker</Text>
            <Text style={styles.tagline}>{isLogin ? 'Chào mừng bạn quay trở lại!' : 'Tạo tài khoản miễn phí'}</Text>
          </Animated.View>

          <Animated.View style={[styles.formCard, { opacity: fadeAnim, transform: [{ translateY: formSlide }] }]}>
            <View style={styles.toggleContainer}>
              <TouchableOpacity style={[styles.toggleBtn, isLogin && styles.toggleBtnActive]} onPress={() => setIsLogin(true)}>
                <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>Đăng nhập</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleBtn, !isLogin && styles.toggleBtnActive]} onPress={() => setIsLogin(false)}>
                <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>Đăng ký</Text>
              </TouchableOpacity>
            </View>

            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Họ tên</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#A0A5C0" style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="Nguyễn Văn A" value={name} onChangeText={setName} placeholderTextColor="#A0A5C0" autoCapitalize="words" />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#A0A5C0" style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="example@gmail.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#A0A5C0" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#A0A5C0" style={styles.inputIcon} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Tối thiểu 6 ký tự" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} placeholderTextColor="#A0A5C0" />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#A0A5C0" />
                </TouchableOpacity>
              </View>
            </View>

            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Xác nhận mật khẩu</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#A0A5C0" style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="Nhập lại mật khẩu" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} placeholderTextColor="#A0A5C0" />
                </View>
              </View>
            )}

            <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
              <Text style={styles.submitBtnText}>{loading ? 'Đang xử lý...' : (isLogin ? 'Đăng nhập' : 'Tạo tài khoản')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.switchContainer} onPress={() => { setIsLogin(!isLogin); setConfirmPassword(''); }}>
              <Text style={styles.switchText}>
                {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
                <Text style={styles.switchAction}>{isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function OnboardingInline({ onFinish }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slides = [
    { iconName: 'wallet', title: 'Chào mừng!', desc: 'Quản lý chi tiêu thông minh với AI tích hợp' },
    { iconName: 'bar-chart', title: 'Theo dõi chi tiêu', desc: 'Thêm giao dịch nhanh chóng, tự động phân loại' },
    { iconName: 'target', title: 'Tiết kiệm thông minh', desc: 'Đặt ngân sách, theo dõi mục tiêu' },
  ];

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      setCurrentIndex(currentIndex + 1);
    } else { onFinish(); }
  };

  const slide = slides[currentIndex];
  return (
    <View style={obStyles.container}>
      <View style={obStyles.bgCircle1} />
      <TouchableOpacity style={obStyles.skipBtn} onPress={onFinish}><Text style={obStyles.skipText}>Bỏ qua</Text></TouchableOpacity>
      <Animated.View style={[obStyles.content, { opacity: fadeAnim }]}>
        <View style={obStyles.iconCircle}>
          <Ionicons name={slide.iconName} size={64} color="#6C5CE7" />
        </View>
        <Text style={obStyles.title}>{slide.title}</Text>
        <Text style={obStyles.desc}>{slide.desc}</Text>
      </Animated.View>
      <View style={obStyles.footer}>
        <View style={obStyles.dots}>
          {slides.map((_, i) => <View key={i} style={[obStyles.dot, i === currentIndex && obStyles.dotActive]} />)}
        </View>
        <TouchableOpacity style={obStyles.nextBtn} onPress={handleNext}>
          <Text style={obStyles.nextText}>{currentIndex === slides.length - 1 ? 'Bắt đầu' : 'Tiếp theo →'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const obStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  bgCircle1: { position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: '#6C5CE720' },
  skipBtn: { position: 'absolute', top: 60, right: 24, zIndex: 10, padding: 8 },
  skipText: { fontSize: 16, color: '#6B7194', fontWeight: '500' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  iconCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#6C5CE720', justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '800', color: '#1A1D2E', marginBottom: 16, textAlign: 'center' },
  desc: { fontSize: 17, color: '#6B7194', textAlign: 'center', lineHeight: 26 },
  footer: { paddingHorizontal: 24, paddingBottom: 50 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E8ECF4' },
  dotActive: { width: 28, backgroundColor: '#6C5CE7' },
  nextBtn: { backgroundColor: '#6C5CE7', padding: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  nextText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1D2E' },
  bgCircle1: { position: 'absolute', top: -120, right: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: '#6C5CE730' },
  bgCircle2: { position: 'absolute', top: height * 0.15, left: -100, width: 250, height: 250, borderRadius: 125, backgroundColor: '#A29BFE15' },
  bgCircle3: { position: 'absolute', bottom: -80, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: '#00CECE10' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 36 },
  logoContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#6C5CE720', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  appName: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5, marginBottom: 8 },
  tagline: { fontSize: 16, color: '#A0A5C0', textAlign: 'center', lineHeight: 24 },
  formCard: { backgroundColor: '#FFFFFF10', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#FFFFFF15', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 10 },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#FFFFFF08', borderRadius: 14, padding: 4, marginBottom: 24 },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  toggleBtnActive: { backgroundColor: '#6C5CE7', shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  toggleText: { fontSize: 15, fontWeight: '600', color: '#A0A5C0' },
  toggleTextActive: { color: '#FFFFFF' },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#FFFFFFCC', marginBottom: 8, marginLeft: 4, letterSpacing: 0.5, textTransform: 'uppercase' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF12', borderRadius: 14, borderWidth: 1, borderColor: '#FFFFFF18', paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, color: '#FFFFFF' },
  eyeBtn: { padding: 8 },
  submitBtn: { backgroundColor: '#6C5CE7', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 8, shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  submitBtnDisabled: { backgroundColor: '#6C5CE780', shadowOpacity: 0.1 },
  submitBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  switchContainer: { marginTop: 24, alignItems: 'center' },
  switchText: { fontSize: 15, color: '#A0A5C0' },
  switchAction: { color: '#A29BFE', fontWeight: '700' },
});
