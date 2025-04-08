import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import CityDetailScreen from '../screens/CityDetailScreen';

// Stack navigator types
type AuthStackParamList = {
  Login: undefined;
};

type MainStackParamList = {
  Home: undefined;
  CityDetail: { cityId: string };
  Favorites: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

// Auth stack - shown when user is not logged in
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
};

// Main stack - shown when user is logged in
const MainNavigator = () => {
  return (
    <MainStack.Navigator>
      <MainStack.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          headerShown: false
        }}
      />
      <MainStack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          headerShown: false
        }}
      />
      <MainStack.Screen
        name="CityDetail"
        component={CityDetailScreen}
        options={{
          headerShown: false,
          presentation: 'modal'
        }}
      />
    </MainStack.Navigator>
  );
};

// Root navigator that switches between auth and main stacks
export const AppNavigator = () => {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}; 