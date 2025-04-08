import { isInternetAvailable } from '../utils/NetworkUtils';
import { storeData, getData, removeData } from '../utils/StorageUtils';
import { City } from './GeoService';

// Storage keys
const WEATHER_DATA_KEY = 'weather_data';
const LAST_FETCH_TIME_KEY = 'weather_last_fetch';
const PENDING_REQUESTS_KEY = 'weather_pending_requests';

// Cache expiration time (in milliseconds): 1 hour
const CACHE_EXPIRATION = 60 * 60 * 1000;

// API configuration
const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
const BASE_URL = process.env.EXPO_PUBLIC_OPENWEATHER_BASE_URL;

// Keep track of in-flight requests to prevent duplicates
const activeRequests: Record<string, Promise<WeatherData>> = {};

export interface WeatherData {
  city: string;
  temperature: number;
  conditions: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  description: string;
  weatherId: number;
  lastUpdated: string;
  forecast: Array<{
    date: string;
    temperature: number;
    icon: string;
  }>;
  // Geo data
  lat?: number;
  lon?: number;
  country?: string;
  // Time data
  timezone?: number; // Timezone offset from UTC in seconds
  sunrise?: number; // Sunrise time (Unix, UTC)
  sunset?: number; // Sunset time (Unix, UTC)
}

/**
 * Optimized function to fetch weather data using Promise.all for parallel requests
 */
export const fetchWeatherFromApi = async (city: City): Promise<WeatherData> => {
  const cityKey = `${city.name}-${city.country}`;
  
  // Return existing in-flight request if one exists
  if (cityKey in activeRequests) {
    console.log(`[WeatherService] Reusing in-flight request for ${city.name}`);
    return activeRequests[cityKey];
  }
  
  try {
    console.log(`[WeatherService] Fetching weather for ${city.name} (${city.lat}, ${city.lon})`);
    
    // Create both promises for parallel execution
    const weatherPromise = fetch(
      `${BASE_URL}/weather?lat=${city.lat}&lon=${city.lon}&appid=${API_KEY}&units=metric`
    );
    
    const forecastPromise = fetch(
      `${BASE_URL}/forecast?lat=${city.lat}&lon=${city.lon}&appid=${API_KEY}&units=metric`
    );
    
    // Store this request in our active requests cache
    activeRequests[cityKey] = (async () => {
      // Execute both requests in parallel
      const [currentResponse, forecastResponse] = await Promise.all([
        weatherPromise,
        forecastPromise
      ]);
      
      if (!currentResponse.ok) {
        throw new Error(`API responded with status: ${currentResponse.status}`);
      }
      
      if (!forecastResponse.ok) {
        throw new Error(`Forecast API responded with status: ${forecastResponse.status}`);
      }
      
      // Parse the JSON responses in parallel
      const [currentData, forecastData] = await Promise.all([
        currentResponse.json(),
        forecastResponse.json()
      ]);
      
      // Process forecast data - get one forecast per day
      const processedForecast = forecastData.list
        .filter((_: any, index: number) => index % 8 === 0) // Get one entry per day (every 24h)
        .slice(0, 5) // Limit to 5 days
        .map((item: any) => ({
          date: new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
          temperature: Math.round(item.main.temp),
          icon: item.weather[0].icon,
        }));
      
      const result = {
        city: city.name,
        temperature: Math.round(currentData.main.temp),
        conditions: currentData.weather[0].main,
        humidity: currentData.main.humidity,
        windSpeed: currentData.wind.speed,
        icon: currentData.weather[0].icon,
        description: currentData.weather[0].description,
        weatherId: currentData.id,
        lastUpdated: new Date().toISOString(),
        forecast: processedForecast,
        lat: city.lat,
        lon: city.lon,
        country: city.country,
        timezone: currentData.timezone, // Add timezone offset in seconds
        sunrise: currentData.sys.sunrise, // Add sunrise time
        sunset: currentData.sys.sunset, // Add sunset time
      };
      
      return result;
    })();
    
    // Wait for the request to complete
    const result = await activeRequests[cityKey];
    
    // Clean up the active request cache
    delete activeRequests[cityKey];
    
    return result;
  } catch (error) {
    // Clean up the active request cache in case of error
    delete activeRequests[cityKey];
    console.error('[WeatherService] Error fetching weather data:', error);
    throw error;
  }
};

/**
 * Store pending requests when offline to sync later
 */
const storePendingRequest = async (city: City): Promise<void> => {
  try {
    const pendingRequests = await getData<City[]>(PENDING_REQUESTS_KEY) || [];
    
    // Check if this city is already in pending requests
    const cityExists = pendingRequests.some(c => 
      c.name === city.name && c.country === city.country
    );
    
    if (!cityExists) {
      pendingRequests.push(city);
      await storeData(PENDING_REQUESTS_KEY, pendingRequests);
      console.log(`[WeatherService] Added ${city.name} to pending requests`);
    }
  } catch (error) {
    console.error('[WeatherService] Error storing pending request:', error);
  }
};

/**
 * Process any pending requests when online
 */
export const processPendingRequests = async (): Promise<void> => {
  try {
    const isOnline = await isInternetAvailable();
    if (!isOnline) {
      return; // Skip if not online
    }
    
    const pendingRequests = await getData<City[]>(PENDING_REQUESTS_KEY) || [];
    if (pendingRequests.length === 0) {
      return; // No pending requests
    }
    
    console.log(`[WeatherService] Processing ${pendingRequests.length} pending requests`);
    
    // Process requests in batches of 3 to avoid overwhelming the API
    const batchSize = 3;
    for (let i = 0; i < pendingRequests.length; i += batchSize) {
      const batch = pendingRequests.slice(i, i + batchSize);
      
      // Process batch in parallel
      await Promise.all(batch.map(async (city) => {
        try {
          const data = await fetchWeatherFromApi(city);
          
          // Store in cache
          const cityKey = `${city.name}-${city.country}`;
          const weatherCache = await getData<{[key: string]: WeatherData}>(WEATHER_DATA_KEY) || {};
          weatherCache[cityKey] = data;
          
          const timeCache = await getData<{[key: string]: number}>(LAST_FETCH_TIME_KEY) || {};
          timeCache[cityKey] = Date.now();
          
          await storeData(WEATHER_DATA_KEY, weatherCache);
          await storeData(LAST_FETCH_TIME_KEY, timeCache);
          
          console.log(`[WeatherService] Processed pending request for ${city.name}`);
        } catch (error) {
          console.error(`[WeatherService] Error processing pending request for ${city.name}:`, error);
        }
      }));
      
      // Small delay between batches to be nice to the API
      if (i + batchSize < pendingRequests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Clear pending requests
    await removeData(PENDING_REQUESTS_KEY);
    console.log('[WeatherService] All pending requests processed');
  } catch (error) {
    console.error('[WeatherService] Error processing pending requests:', error);
  }
};

/**
 * Get weather data - from API if online, from cache if offline
 * Improved with in-flight request deduplication and error handling
 * @param city The city to get weather for
 * @param forceRefresh If true, bypasses cache and forces a fresh API call
 */
export const getWeatherData = async (city: City, forceRefresh = false): Promise<WeatherData | null> => {
  try {
    const cityKey = `${city.name}-${city.country}`;
    const isOnline = await isInternetAvailable();
    const lastFetchTime = await getData<{[key: string]: number}>(LAST_FETCH_TIME_KEY) || {};
    const currentTime = Date.now();
    const isCacheExpired = !lastFetchTime[cityKey] || 
                          (currentTime - lastFetchTime[cityKey] > CACHE_EXPIRATION) || 
                          forceRefresh;
    
    console.log(`[WeatherService] Network status: ${isOnline ? 'Online' : 'Offline'}, Cache expired: ${isCacheExpired}, Force refresh: ${forceRefresh}`);
    
    // Try to get fresh data if online and (cache expired or force refresh)
    if (isOnline && isCacheExpired) {
      console.log('[WeatherService] Fetching fresh weather data');
      
      try {
        // Clear previous cache if forced refresh
        if (forceRefresh) {
          await clearCityWeatherCache(city);
        }
        
        const freshData = await fetchWeatherFromApi(city);
        
        // Store data in cache
        const weatherCache = await getData<{[key: string]: WeatherData}>(WEATHER_DATA_KEY) || {};
        weatherCache[cityKey] = freshData;
        
        const timeCache = await getData<{[key: string]: number}>(LAST_FETCH_TIME_KEY) || {};
        timeCache[cityKey] = currentTime;
        
        await storeData(WEATHER_DATA_KEY, weatherCache);
        await storeData(LAST_FETCH_TIME_KEY, timeCache);
        
        return freshData;
      } catch (error) {
        console.error('[WeatherService] Error fetching fresh data, trying cache:', error);
        // On error, fall back to cache if available
        const weatherCache = await getData<{[key: string]: WeatherData}>(WEATHER_DATA_KEY) || {};
        if (weatherCache[cityKey]) {
          console.log('[WeatherService] Using cached data after fetch error');
          return weatherCache[cityKey];
        }
        throw error; // Re-throw if no cache available
      }
    }
    
    // Offline or cache not expired - use cached data
    console.log('[WeatherService] Using cached weather data');
    const weatherCache = await getData<{[key: string]: WeatherData}>(WEATHER_DATA_KEY) || {};
    const cachedData = weatherCache[cityKey];
    
    // If offline and no cache, store request for later
    if (!cachedData && !isOnline) {
      console.log(`[WeatherService] Offline with no cache for ${city.name}, storing for later`);
      await storePendingRequest(city);
      return null;
    }
    
    // If online, no cache, and cache expired, fetch fresh
    if (!cachedData && isOnline) {
      console.log('[WeatherService] No cache available, fetching from API');
      const freshData = await fetchWeatherFromApi(city);
      
      // Store data in cache
      const weatherCache = await getData<{[key: string]: WeatherData}>(WEATHER_DATA_KEY) || {};
      weatherCache[cityKey] = freshData;
      
      const timeCache = await getData<{[key: string]: number}>(LAST_FETCH_TIME_KEY) || {};
      timeCache[cityKey] = currentTime;
      
      await storeData(WEATHER_DATA_KEY, weatherCache);
      await storeData(LAST_FETCH_TIME_KEY, timeCache);
      
      return freshData;
    }
    
    return cachedData || null;
  } catch (error) {
    console.error('[WeatherService] Error getting weather data:', error);
    return null;
  }
};

/**
 * Clear weather cache for a specific city
 */
export const clearCityWeatherCache = async (city: City): Promise<void> => {
  try {
    const cityKey = `${city.name}-${city.country}`;
    
    // Get existing caches
    const weatherCache = await getData<{[key: string]: WeatherData}>(WEATHER_DATA_KEY) || {};
    const timeCache = await getData<{[key: string]: number}>(LAST_FETCH_TIME_KEY) || {};
    
    // Remove this city from caches
    if (weatherCache[cityKey]) {
      delete weatherCache[cityKey];
      await storeData(WEATHER_DATA_KEY, weatherCache);
    }
    
    if (timeCache[cityKey]) {
      delete timeCache[cityKey];
      await storeData(LAST_FETCH_TIME_KEY, timeCache);
    }
    
    console.log(`[WeatherService] Weather cache cleared for ${city.name}`);
  } catch (error) {
    console.error('[WeatherService] Error clearing city weather cache:', error);
    throw error;
  }
};

/**
 * Clear all weather cache
 */
export const clearAllWeatherCache = async (): Promise<void> => {
  try {
    await removeData(WEATHER_DATA_KEY);
    await removeData(LAST_FETCH_TIME_KEY);
    await removeData(PENDING_REQUESTS_KEY);
    console.log('[WeatherService] All weather cache cleared');
  } catch (error) {
    console.error('[WeatherService] Error clearing all weather cache:', error);
    throw error;
  }
}; 