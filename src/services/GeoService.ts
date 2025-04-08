import { isInternetAvailable } from '../utils/NetworkUtils';
import { storeData, getData } from '../utils/StorageUtils';

// API configuration - replace with your actual API key
const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
const GEO_URL = process.env.EXPO_PUBLIC_OPENWEATHER_GEO_URL;

// Storage keys
const RECENT_SEARCHES_KEY = 'recent_city_searches';

export interface City {
  name: string;
  lat: number;
  lon: number;
  country: string;
}

/**
 * Search for cities based on query string
 * @param query The search query (city name)
 * @returns List of matching cities
 */
export const searchCities = async (query: string): Promise<City[]> => {
  if (query.length < 2) {
    return [];
  }
  
  try {
    // Check if online
    const isOnline = await isInternetAvailable();
    
    if (!isOnline) {
      console.log('[GeoService] Offline - using cached recent searches');
      const recentSearches = await getRecentSearches();
      return recentSearches.filter(city => 
        city.name.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    // Online - search from API
    console.log(`[GeoService] Searching for cities matching: ${query}`);
    const response = await fetch(
      `${GEO_URL}/direct?q=${query}&limit=5&appid=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[GeoService] Error searching for cities:', error);
    return [];
  }
};

/**
 * Add a city to recent searches
 * @param city The city to add to recent searches
 */
export const addToRecentSearches = async (city: City): Promise<void> => {
  try {
    // Get current recent searches
    const recentSearches = await getRecentSearches();
    
    // Check if city is already in recent searches
    const cityExists = recentSearches.some(c => 
      c.name === city.name && c.country === city.country
    );
    
    if (!cityExists) {
      // Add to beginning of list and keep only the most recent 10
      const updatedSearches = [city, ...recentSearches].slice(0, 10);
      await storeData(RECENT_SEARCHES_KEY, updatedSearches);
      console.log(`[GeoService] Added ${city.name} to recent searches`);
    }
  } catch (error) {
    console.error('[GeoService] Error adding to recent searches:', error);
  }
};

/**
 * Get recent city searches
 * @returns List of recently searched cities
 */
export const getRecentSearches = async (): Promise<City[]> => {
  try {
    const recentSearches = await getData<City[]>(RECENT_SEARCHES_KEY);
    return recentSearches || [];
  } catch (error) {
    console.error('[GeoService] Error getting recent searches:', error);
    return [];
  }
}; 