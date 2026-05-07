# Expense Tracker Full Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the expense tracker into a complete, production-ready personal finance app with modern UI/UX, tab navigation, dark mode, onboarding, and 6 new features.

**Architecture:** React Native (Expo) frontend with Express backend. New features require both frontend screens and backend API endpoints.

**Tech Stack:**
- Frontend: React Native (Expo), React Navigation (Bottom Tabs)
- Backend: Node.js, Express, MongoDB/Mongoose
- Storage: AsyncStorage for local preferences

---

## File Structure

### Mobile App
```
mobile/
├── app/
│   ├── (tabs)/                    # NEW: Tab navigation layout
│   │   ├── _layout.js             # Tab navigator setup
│   │   ├── index.js               # Home tab
│   │   ├── transactions.js        # Transactions tab
│   │   ├── budget.js              # Budget tab
│   │   └── profile.js             # Profile tab
│   ├── (auth)/
│   │   └── login.js
│   ├── (main)/                   # Keep existing for now
│   ├── onboarding.js              # NEW: Onboarding screen
│   └── _layout.js
├── src/
│   ├── components/               # NEW: Shared components
│   │   ├── theme.js              # Theme colors, dark mode
│   │   ├── Card.js
│   │   ├── Button.js
│   │   └── FAB.js               # Floating Action Button
│   ├── screens/                 # NEW: Feature screens
│   │   ├── accounts/
│   │   ├── recurring/
│   │   ├── goals/
│   │   └── settings/
│   └── context/
│       └── ThemeContext.js       # NEW: Dark mode context
└── package.json
```

### Backend
```
backend/
└── src/
    ├── models/
    │   ├── Account.js            # NEW
    │   ├── Recurring.js          # NEW
    │   ├── SavingsGoal.js       # NEW
    │   └── Notification.js      # NEW
    ├── routes/
    │   ├── accounts.js          # NEW
    │   ├── recurring.js         # NEW
    │   ├── goals.js             # NEW
    │   ├── notifications.js    # NEW
    │   └── export.js            # NEW
    └── index.js                 # Register new routes
```

---

## PHASE 1: Navigation & Onboarding

### Task 1.1: Install React Navigation Bottom Tabs

**Files:**
- Modify: `mobile/package.json`
- Modify: `mobile/app/_layout.js`

- [ ] **Step 1: Add dependencies**

```bash
cd mobile && npm install @react-navigation/bottom-tabs
```

- [ ] **Step 2: Update package.json dependencies**

Add to package.json:
```json
"@react-navigation/bottom-tabs": "^7.0.0"
```

- [ ] **Step 3: Test build**

```bash
npx expo export --platform web
```

- [ ] **Step 4: Commit**

```bash
git add mobile/package.json mobile/package-lock.json
git commit -m "feat: add bottom-tabs navigation dependency"
```

---

### Task 1.2: Create Theme System

**Files:**
- Create: `mobile/src/components/theme.js`
- Create: `mobile/src/context/ThemeContext.js`

- [ ] **Step 1: Create theme.js**

```javascript
// mobile/src/components/theme.js
export const lightTheme = {
  colors: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#1A1A1A',
    textSecondary: '#666666',
    primary: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    border: '#E5E5E5',
  },
};

export const darkTheme = {
  colors: {
    background: '#1A1A1A',
    surface: '#2C2C2E',
    text: '#FFFFFF',
    textSecondary: '#ABABAB',
    primary: '#0A84FF',
    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF453A',
    border: '#38383A',
  },
};
```

- [ ] **Step 2: Create ThemeContext.js**

```javascript
// mobile/src/context/ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../components/theme';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');
  const [manualDarkMode, setManualDarkMode] = useState(null);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    const saved = await AsyncStorage.getItem('darkMode');
    if (saved !== null) {
      setManualDarkMode(saved === 'true');
    }
  };

  const toggleDarkMode = async () => {
    const newValue = !isDarkMode;
    setManualDarkMode(newValue);
    await AsyncStorage.setItem('darkMode', String(newValue));
  };

  const theme = (manualDarkMode !== null ? manualDarkMode : systemColorScheme === 'dark') ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode: manualDarkMode !== null ? manualDarkMode : systemColorScheme === 'dark', toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/theme.js mobile/src/context/ThemeContext.js
git commit -m "feat: add theme system with dark mode support"
```

---

### Task 1.3: Create Tab Navigation Layout

**Files:**
- Create: `mobile/app/(tabs)/_layout.js`
- Modify: `mobile/app/_layout.js`

- [ ] **Step 1: Create (tabs)/_layout.js**

```javascript
// mobile/app/(tabs)/_layout.js
import { Tabs } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Giao dịch',
          tabBarIcon: ({ color }) => <TabIcon name="receipt" color={color} />,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Ngân sách',
          tabBarIcon: ({ color }) => <TabIcon name="wallet" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Hồ sơ',
          tabBarIcon: ({ color }) => <TabIcon name="person" color={color} />,
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Create index.js for Home tab**

```javascript
// mobile/app/(tabs)/index.js - Home Screen
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Text style={styles.headerTitle}>💰 Quản lý Chi tiêu</Text>
        <Text style={styles.headerSubtitle}>Tháng 5/2026</Text>
      </View>
      
      <ScrollView style={styles.content}>
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.success + '20' }]}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Thu nhập</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.success }]}>15,000,000 ₫</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.error + '20' }]}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Chi tiêu</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.error }]}>8,500,000 ₫</Text>
          </View>
        </View>
        
        <View style={[styles.balanceCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>Số dư</Text>
          <Text style={[styles.balanceValue, { color: theme.colors.text }]}>6,500,000 ₫</Text>
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Thao tác nhanh</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.primary }]} onPress={() => router.push('/transactions')}>
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={styles.actionText}>Giao dịch</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.success }]} onPress={() => router.push('/budget')}>
            <Text style={styles.actionIcon}>🎯</Text>
            <Text style={styles.actionText}>Ngân sách</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 50 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  content: { flex: 1, padding: 16 },
  summaryRow: { flexDirection: 'row', marginBottom: 12 },
  summaryCard: { flex: 1, padding: 16, borderRadius: 12, marginHorizontal: 4 },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  balanceCard: { padding: 20, borderRadius: 12, marginBottom: 20 },
  balanceLabel: { fontSize: 14 },
  balanceValue: { fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  quickActions: { flexDirection: 'row', gap: 12 },
  actionButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  actionIcon: { fontSize: 24 },
  actionText: { color: '#fff', fontWeight: '600', marginTop: 8 },
});
```

- [ ] **Step 3: Update root _layout.js to use ThemeProvider**

```javascript
// mobile/app/_layout.js
import { Stack } from 'expo-router';
import { ThemeProvider } from '../src/context/ThemeContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
      </Stack>
    </ThemeProvider>
  );
}
```

- [ ] **Step 4: Build and test**

```bash
cd mobile && npx expo export --platform web
```

- [ ] **Step 5: Commit**

```bash
git add mobile/app mobile/src
git commit -m "feat: add tab navigation layout with theme system"
```

---

### Task 1.4: Create Onboarding Screen

**Files:**
- Create: `mobile/app/onboarding.js`
- Modify: `mobile/app/_layout.js`

- [ ] **Step 1: Create onboarding.js**

```javascript
// mobile/app/onboarding.js
import { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const slides = [
  {
    key: '1',
    title: 'Chào mừng!',
    description: 'Quản lý chi tiêu thông minh với AI',
    icon: '💰',
  },
  {
    key: '2',
    title: 'Theo dõi chi tiêu',
    description: 'Thêm giao dịch nhanh chóng, tự động phân loại với AI',
    icon: '📊',
  },
  {
    key: '3',
    title: 'Tiết kiệm thông minh',
    description: 'Đặt ngân sách, theo dõi mục tiêu tiết kiệm',
    icon: '🎯',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleSkip = async () => {
    await AsyncStorage.setItem('hasOnboarded', 'true');
    router.replace('/(auth)/login');
  };

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      await AsyncStorage.setItem('hasOnboarded', 'true');
      router.replace('/(auth)/login');
    }
  };

  const renderSlide = ({ item }) => (
    <View style={styles.slide}>
      <Text style={styles.icon}>{item.icon}</Text>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Bỏ qua</Text>
      </TouchableOpacity>

      <FlatList
        data={slides}
        renderItem={renderSlide}
        keyExtractor={item => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        scrollEventThrottle={16}
      />

      <View style={styles.pagination}>
        {slides.map((_, index) => (
          <View key={index} style={[styles.dot, currentIndex === index && styles.activeDot]} />
        ))}
      </View>

      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>
          {currentIndex === slides.length - 1 ? 'Bắt đầu' : 'Tiếp theo'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  skipButton: { position: 'absolute', top: 60, right: 20, zIndex: 10 },
  skipText: { fontSize: 16, color: '#666' },
  slide: { width, alignItems: 'center', paddingHorizontal: 40, paddingTop: 60 },
  icon: { fontSize: 80, marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  description: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24 },
  pagination: { flexDirection: 'row', justifyContent: 'center', marginBottom: 40 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd', marginHorizontal: 4 },
  activeDot: { backgroundColor: '#007AFF', width: 24 },
  nextButton: { backgroundColor: '#007AFF', marginHorizontal: 20, padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 40 },
  nextButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
```

- [ ] **Step 2: Update _layout.js to check onboarding**

```javascript
// Add to mobile/app/_layout.js
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In the component:
const [showOnboarding, setShowOnboarding] = useState(true);

useEffect(() => {
  checkOnboarding();
}, []);

const checkOnboarding = async () => {
  const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');
  setShowOnboarding(hasOnboarded === 'true');
};

// In the Stack:
// Add before (tabs): 
{showOnboarding && <Screen name="onboarding" component={OnboardingScreen} />}
```

- [ ] **Step 3: Build and test**

```bash
cd mobile && npx expo export --platform web
```

- [ ] **Step 4: Commit**

```bash
git add mobile/app/onboarding.js mobile/app/_layout.js
git commit -m "feat: add onboarding screen"
```

---

## PHASE 2: UI Refactoring & Dark Mode

### Task 2.1: Refactor Transactions Tab

**Files:**
- Modify: `mobile/app/(tabs)/transactions.js`

### Task 2.2: Refactor Budget Tab

**Files:**
- Modify: `mobile/app/(tabs)/budget.js`

### Task 2.3: Create Profile Tab

**Files:**
- Create: `mobile/app/(tabs)/profile.js`

### Task 2.4: Add Floating Action Button

**Files:**
- Create: `mobile/src/components/FAB.js`

---

## PHASE 3: New Features

### Task 3.1: Accounts Feature

**Backend:**
- Create: `backend/src/models/Account.js`
- Create: `backend/src/routes/accounts.js`

**Frontend:**
- Create: `mobile/src/screens/accounts/AccountListScreen.js`
- Create: `mobile/src/screens/accounts/AccountFormScreen.js`

### Task 3.2: Recurring Transactions

**Backend:**
- Create: `backend/src/models/Recurring.js`
- Create: `backend/src/routes/recurring.js`

**Frontend:**
- Create: `mobile/src/screens/recurring/RecurringListScreen.js`
- Create: `mobile/src/screens/recurring/RecurringFormScreen.js`

### Task 3.3: Savings Goals

**Backend:**
- Create: `backend/src/models/SavingsGoal.js`
- Create: `backend/src/routes/goals.js`

**Frontend:**
- Create: `mobile/src/screens/goals/GoalsListScreen.js`
- Create: `mobile/src/screens/goals/GoalDetailScreen.js`

---

## PHASE 4: Notifications, Export, Profile

### Task 4.1: Notifications

**Backend:**
- Create: `backend/src/models/Notification.js`
- Create: `backend/src/routes/notifications.js`

**Frontend:**
- Add notification UI to Profile tab

### Task 4.2: Data Export

**Backend:**
- Create: `backend/src/routes/export.js`

**Frontend:**
- Add export button to Profile tab

### Task 4.3: Profile Enhancements

**Frontend:**
- Create: `mobile/app/(tabs)/profile.js` with all settings
- Add dark mode toggle
- Add accounts management link
- Add goals link

---

## Implementation Order Summary

1. **Task 1.1:** Install dependencies
2. **Task 1.2:** Create theme system
3. **Task 1.3:** Create tab navigation
4. **Task 1.4:** Create onboarding
5. **Task 2.1-2.4:** UI refinements
6. **Task 3.1-3.3:** New features (Accounts, Recurring, Goals)
7. **Task 4.1-4.3:** Notifications, Export, Profile

---

## Testing

After each task:
```bash
cd mobile && npx expo export --platform web
```

For full testing:
1. Start backend: `cd backend && npm start`
2. Start mobile: `cd mobile && npx expo start`
3. Test on device/emulator

---

## Notes

- Use consistent styling with theme system
- Test dark mode after implementation
- All new API endpoints need authentication middleware
- Export feature requires proper date handling for Vietnam locale