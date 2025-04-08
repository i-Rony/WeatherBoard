import { FONTS, TEXT_STYLES } from './FontUtils';

// App colors
export const COLORS = {
  primary: '#4A90E2',
  secondary: '#50E3C2',
  accent: '#F5A623',
  error: '#D0021B',
  success: '#7ED321',
  warning: '#F8E71C',
  background: '#FFFFFF',
  card: '#F8F8F8',
  text: '#333333',
  subtext: '#888888',
  border: '#E0E0E0',
};

// App spacing 
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius
export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 16,
  pill: 100,
};

// Shadow styles
export const SHADOWS = {
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  heavy: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Combine all styles into a single theme object
export const theme = {
  colors: COLORS,
  fonts: FONTS,
  textStyles: TEXT_STYLES,
  spacing: SPACING,
  borderRadius: BORDER_RADIUS,
  shadows: SHADOWS,
}; 