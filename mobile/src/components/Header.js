import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES } from '../constants/theme';

const Header = ({ title, showBack = false, rightComponent = null }) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {showBack && (
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Quay lại</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.title}>{title}</Text>
      {rightComponent && <View style={styles.right}>{rightComponent}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    paddingTop: SPACING.xxl + 10,
  },
  backButton: {
    marginBottom: SPACING.sm,
  },
  backText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  right: {
    position: 'absolute',
    right: SPACING.lg,
    top: SPACING.xxl + 14,
  },
});

export default Header;