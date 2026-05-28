// Theme Colors
export const COLORS = {
  // Primary
  primary: '#007AFF',
  primaryLight: '#4DA2FF',
  primaryDark: '#0056B3',
  
  // Status
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  
  // Neutral
  white: '#FFFFFF',
  background: '#f5f5f5',
  border: '#ddd',
  textPrimary: '#333',
  textSecondary: '#666',
  textLight: '#999',
  
  // Income/Expense
  income: '#34C759',
  expense: '#FF3B30',
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

// Border Radius
export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 20,
};

// Font Sizes
export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  title: 28,
};

// === Theme objects for useTheme hook ===

export const lightTheme = {
  background: '#F8F9FE',
  surface: '#FFFFFF',
  surfaceVariant: '#F0F2FF',
  text: '#1A1D2E',
  textSecondary: '#6B7194',
  textLight: '#A0A5C0',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDark: '#5341D6',
  primarySurface: '#F0EEFF',
  accent: '#00CECE',
  accentLight: '#81ECEC',
  success: '#00B894',
  successLight: '#55EFC4',
  warning: '#FDCB6E',
  warningDark: '#E17055',
  error: '#FF6B6B',
  errorLight: '#FFB8B8',
  border: '#E8ECF4',
  shadow: '#6C5CE720',
  gradientPrimary: ['#6C5CE7', '#A29BFE'],
  gradientSuccess: ['#00B894', '#55EFC4'],
  gradientError: ['#FF6B6B', '#EE5A24'],
  gradientAccent: ['#6C5CE7', '#00CECE'],
  gradientHeader: ['#6C5CE7', '#8B7CF6', '#A29BFE'],
  gradientCard: ['#FFFFFF', '#F8F9FE'],
};

export const darkTheme = {
  background: '#0F0E17',
  surface: '#1A1A2E',
  surfaceVariant: '#222240',
  text: '#FFFFFE',
  textSecondary: '#A7A9BE',
  textLight: '#636585',
  primary: '#A29BFE',
  primaryLight: '#C4BFFF',
  primaryDark: '#6C5CE7',
  primarySurface: '#2A2750',
  accent: '#00CECE',
  accentLight: '#81ECEC',
  success: '#55EFC4',
  successLight: '#00B89480',
  warning: '#FDCB6E',
  warningDark: '#E17055',
  error: '#FF6B6B',
  errorLight: '#FF6B6B40',
  border: '#2D2D50',
  shadow: '#00000040',
  gradientPrimary: ['#6C5CE7', '#A29BFE'],
  gradientSuccess: ['#00B894', '#55EFC4'],
  gradientError: ['#FF6B6B', '#EE5A24'],
  gradientAccent: ['#6C5CE7', '#00CECE'],
  gradientHeader: ['#1A1A2E', '#2A2750', '#3A3770'],
  gradientCard: ['#1A1A2E', '#222240'],
};
