import { StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '../constants/theme';

export const headerStyles = StyleSheet.create({
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
