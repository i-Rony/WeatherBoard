import React from 'react';
import { TextInput as RNTextInput, TextInputProps, StyleSheet } from 'react-native';
import { FONTS } from '../../utils/FontUtils';

interface CustomTextInputProps extends TextInputProps {
  variant?: 'default' | 'filled' | 'outlined';
}

export const TextInput: React.FC<CustomTextInputProps> = ({
  style,
  variant = 'default',
  ...props
}) => {
  return (
    <RNTextInput
      style={[
        styles.base,
        variant === 'filled' && styles.filled,
        variant === 'outlined' && styles.outlined,
        style,
      ]}
      placeholderTextColor="#aaa"
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    fontFamily: FONTS.POPPINS_REGULAR,
  },
  filled: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ddd',
  },
}); 