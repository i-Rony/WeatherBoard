import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Save data to local storage
 * @param key The storage key
 * @param value The value to store
 * @returns Promise<void>
 */
export const storeData = async (key: string, value: any): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
    console.log(`[StorageUtils] Data stored for key: ${key}`);
  } catch (error) {
    console.error(`[StorageUtils] Error storing data for key: ${key}`, error);
    throw error;
  }
};

/**
 * Retrieve data from local storage
 * @param key The storage key
 * @returns Promise with the stored value or null if not found
 */
export const getData = async <T>(key: string): Promise<T | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error(`[StorageUtils] Error retrieving data for key: ${key}`, error);
    return null;
  }
};

/**
 * Remove an item from storage
 * @param key The storage key to remove
 * @returns Promise<void>
 */
export const removeData = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`[StorageUtils] Data removed for key: ${key}`);
  } catch (error) {
    console.error(`[StorageUtils] Error removing data for key: ${key}`, error);
    throw error;
  }
};

/**
 * Clear all storage
 * @returns Promise<void>
 */
export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.clear();
    console.log('[StorageUtils] All data cleared from storage');
  } catch (error) {
    console.error('[StorageUtils] Error clearing all data from storage', error);
    throw error;
  }
}; 