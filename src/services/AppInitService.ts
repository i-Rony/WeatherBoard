import { isInternetAvailable } from '../utils/NetworkUtils';
import { updateAllFavorites } from './FavoritesUpdateService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Token storage key (must match the key used in AuthContext)
const TOKEN_STORAGE_KEY = 'secure_user_token';

/**
 * Initialize the app on startup
 * - Checks for internet connectivity
 * - Updates all favorites with fresh weather data if user is logged in
 */
export const initializeApp = async (): Promise<void> => {
  try {
    console.log('[AppInit] Initializing app...');

    // Check for internet connectivity
    const isOnline = await isInternetAvailable();
    if (!isOnline) {
      console.log('[AppInit] Device is offline, skipping weather updates');
      return;
    }

    // Check if user is logged in
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      console.log('[AppInit] No authentication token found, skipping weather updates');
      return;
    }

    // Update favorites with fresh weather data
    console.log('[AppInit] Updating favorites with current weather data');
    await updateAllFavorites();
    
    console.log('[AppInit] App initialization complete');
  } catch (error) {
    console.error('[AppInit] Error during app initialization:', error);
  }
}; 