import * as Network from 'expo-network';

/**
 * Checks if the device has an active internet connection
 * @returns Promise<boolean> true if internet is available
 */
export const isInternetAvailable = async (): Promise<boolean> => {
  try {
    const networkState = await Network.getNetworkStateAsync();
    console.log('[NetworkUtils] Network state:', networkState);
    return !!(networkState.isConnected && networkState.isInternetReachable);
  } catch (error) {
    console.error('[NetworkUtils] Error checking network connectivity:', error);
    return false;
  }
};

/**
 * Get the current network type
 * @returns Promise<string> type of network connection
 */
export const getNetworkType = async (): Promise<string> => {
  try {
    const networkState = await Network.getNetworkStateAsync();
    return networkState.type || 'UNKNOWN'; 
  } catch (error) {
    console.error('[NetworkUtils] Error getting network type:', error);
    return 'UNKNOWN';
  }
}; 