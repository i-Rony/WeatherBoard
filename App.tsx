import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from './src/api/graphql';
import { initializeApp } from './src/services/AppInitService';
import { useFonts } from './src/utils/FontUtils';
import * as SplashScreen from 'expo-splash-screen';

// Prevent the splash screen from automatically hiding
SplashScreen.preventAutoHideAsync();

export default function App() {
  const { fontsLoaded, fontsError } = useFonts();
  
  // Initialize app on startup
  useEffect(() => {
    const init = async () => {
      try {
        await initializeApp();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };
    
    init();
  }, []);

  // Hide splash screen once fonts are loaded
  useEffect(() => {
    if (fontsLoaded || fontsError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontsError]);

  // Show loading indicator while fonts are loading
  if (!fontsLoaded && !fontsError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <ApolloProvider client={apolloClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <AppNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </ApolloProvider>
  );
}
