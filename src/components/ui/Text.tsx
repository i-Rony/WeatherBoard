import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { FONTS, TEXT_STYLES } from '../../utils/FontUtils';

interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'bodySmall' | 'caption';
  weight?: 'light' | 'regular' | 'medium' | 'bold';
  color?: string;
}

export const Text: React.FC<TextProps> = ({
  children,
  variant = 'body',
  weight,
  color,
  style,
  ...props
}) => {
  // Determine font family based on weight or use the default from variant
  let fontFamily = TEXT_STYLES[variant].fontFamily;
  
  if (weight) {
    switch (weight) {
      case 'light':
        fontFamily = FONTS.POPPINS_LIGHT;
        break;
      case 'regular':
        fontFamily = FONTS.POPPINS_REGULAR;
        break;
      case 'medium':
        fontFamily = FONTS.POPPINS_MEDIUM;
        break;
      case 'bold':
        fontFamily = FONTS.POPPINS_BOLD;
        break;
    }
  }

  return (
    <RNText
      style={[
        TEXT_STYLES[variant],
        { fontFamily },
        color && { color },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}; 