import * as Font from 'expo-font';
import { useEffect, useState } from 'react';

// Define our font families that will be used throughout the app
export const FONTS = {
  POPPINS_LIGHT: 'Poppins-Light',
  POPPINS_REGULAR: 'Poppins-Regular',
  POPPINS_MEDIUM: 'Poppins-Medium',
  POPPINS_BOLD: 'Poppins-Bold',
};

// Custom hook to load fonts
export const useFonts = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontsError, setFontsError] = useState<Error | null>(null);

  useEffect(() => {
    const loadFonts = async () => {
      try {
        await Font.loadAsync({
          [FONTS.POPPINS_LIGHT]: require('../../assets/fonts/Poppins-Light.ttf'),
          [FONTS.POPPINS_REGULAR]: require('../../assets/fonts/Poppins-Regular.ttf'),
          [FONTS.POPPINS_MEDIUM]: require('../../assets/fonts/Poppins-Medium.ttf'),
          [FONTS.POPPINS_BOLD]: require('../../assets/fonts/Poppins-Bold.ttf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
        setFontsError(error instanceof Error ? error : new Error('Unknown font loading error'));
      }
    };

    loadFonts();
  }, []);

  return { fontsLoaded, fontsError };
};

// Define text styles using Poppins for the entire app
export const TEXT_STYLES = {
  h1: {
    fontFamily: FONTS.POPPINS_BOLD,
    fontSize: 28,
  },
  h2: {
    fontFamily: FONTS.POPPINS_BOLD,
    fontSize: 24,
  },
  h3: {
    fontFamily: FONTS.POPPINS_MEDIUM,
    fontSize: 20,
  },
  body: {
    fontFamily: FONTS.POPPINS_REGULAR,
    fontSize: 16,
  },
  bodySmall: {
    fontFamily: FONTS.POPPINS_REGULAR,
    fontSize: 14,
  },
  caption: {
    fontFamily: FONTS.POPPINS_LIGHT,
    fontSize: 12,
  },
}; 