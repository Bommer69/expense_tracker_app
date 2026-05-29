import { useState, useRef } from 'react';
import { View, Text, Dimensions, TouchableOpacity, FlatList, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { onboardingStyles as styles } from '../src/styles/onboardingStyles';

const { width } = Dimensions.get('window');

const slides = [
  {
    key: '1',
    title: 'Chào mừng!',
    description: 'Quản lý chi tiêu thông minh với AI',
    iconName: 'wallet',
  },
  {
    key: '2',
    title: 'Theo dõi chi tiêu',
    description: 'Thêm giao dịch nhanh chóng, tự động phân loại với AI',
    iconName: 'bar-chart',
  },
  {
    key: '3',
    title: 'Tiết kiệm thông minh',
    description: 'Đặt ngân sách, theo dõi mục tiêu tiết kiệm',
    iconName: 'locate-outline',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  const handleSkip = async () => {
    await AsyncStorage.setItem('hasOnboarded', 'true');
    router.replace('/(auth)/login');
  };

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      await AsyncStorage.setItem('hasOnboarded', 'true');
      router.replace('/(auth)/login');
    }
  };

  const renderSlide = ({ item, index }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.5, 1, 0.5],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[styles.slide, { opacity, transform: [{ scale }] }]}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={item.iconName} size={80} color="#6C5CE7" />
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </Animated.View>
    );
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: true,
      listener: (event) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / width);
        setCurrentIndex(index);
      },
    }
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Bỏ qua</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onScroll={onScroll}
        scrollEventThrottle={16}
      />

      <View style={styles.pagination}>
        {slides.map((_, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });
          const backgroundColor = scrollX.interpolate({
            inputRange,
            outputRange: ['#ddd', '#007AFF', '#ddd'],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                { width: dotWidth, backgroundColor },
              ]}
            />
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.nextButton, currentIndex === slides.length - 1 && styles.startButton]}
        onPress={handleNext}
      >
        <Text style={[styles.nextButtonText, currentIndex === slides.length - 1 && styles.startButtonText]}>
          {currentIndex === slides.length - 1 ? 'Bắt đầu' : 'Tiếp theo'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
