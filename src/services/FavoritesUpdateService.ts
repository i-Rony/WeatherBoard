import { apolloClient, LIST_ITEMS, saveFavoriteCity, FavoriteWeatherData } from '../api/graphql';
import { City } from './GeoService';
import { fetchWeatherFromApi } from './WeatherService';
import { searchCities } from './GeoService';

// Interface for favorite city item from GraphQL
interface FavoriteItem {
  id: string;
  name: string;
  country?: string;
  lat?: number;
  lon?: number;
  metadata: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get geo coordinates for a city by searching OpenWeather Geo API
 * @param cityName The name of the city to search for
 * @returns City object with coordinates or null if not found
 */
const getGeoDataForCity = async (cityName: string): Promise<City | null> => {
  try {
    console.log(`[FavoritesUpdateService] Searching for geo data for ${cityName}`);
    const cities = await searchCities(cityName);
    
    if (cities && cities.length > 0) {
      // Take the first result as the most likely match
      console.log(`[FavoritesUpdateService] Found geo data for ${cityName}: (${cities[0].lat}, ${cities[0].lon})`);
      return cities[0];
    }
    
    console.log(`[FavoritesUpdateService] No geo data found for ${cityName}`);
    return null;
  } catch (error) {
    console.error(`[FavoritesUpdateService] Error getting geo data for ${cityName}:`, error);
    return null;
  }
};

/**
 * Update all favorite cities with fresh weather data
 * - Fetches all favorites
 * - Gets updated weather data for each
 * - Updates each favorite with new data
 * @returns Promise<number> Number of successfully updated favorites
 */
export const updateAllFavorites = async (): Promise<number> => {
  try {
    console.log('[FavoritesUpdateService] Starting update for all favorites');
    
    // Fetch all favorites
    const response = await apolloClient.query({
      query: LIST_ITEMS,
      fetchPolicy: 'network-only' // Skip cache to get fresh data
    });
    
    const allItems = response.data.listItems || [];
    
    // Filter out items marked as deleted
    const validItems = allItems.filter((item: FavoriteItem) => {
      try {
        const metadata = JSON.parse(item.metadata);
        // Skip items with empty content or marked as deleted
        if (item.content === "" || metadata.deleted === true) {
          console.log(`[FavoritesUpdateService] Skipping deleted item: ${item.name}`);
          return false;
        }
        return true;
      } catch (e) {
        // If we can't parse metadata, skip it to be safe
        console.error(`[FavoritesUpdateService] Error parsing metadata for ${item.name}, skipping:`, e);
        return false;
      }
    });
    
    // Deduplicate cities to avoid updating the same city multiple times
    // For each city name + weather ID combination, keep only the most recent item
    const cityMap = new Map<string, FavoriteItem>();
    
    validItems.forEach((item: FavoriteItem) => {
      try {
        const metadata = JSON.parse(item.metadata);
        const cityName = item.name.toLowerCase();
        const weatherId = metadata.weatherId || 0;
        // Create a composite key for uniqueness
        const key = `${cityName}-${weatherId}`;
        
        if (!cityMap.has(key) || 
            new Date(item.updatedAt) > new Date(cityMap.get(key)!.updatedAt)) {
          // Keep the most recent item
          cityMap.set(key, item);
        }
      } catch (e) {
        // If parsing fails, use just the city name as key
        const key = item.name.toLowerCase();
        
        if (!cityMap.has(key) || 
            new Date(item.updatedAt) > new Date(cityMap.get(key)!.updatedAt)) {
          cityMap.set(key, item);
        }
      }
    });
    
    // Convert map back to array
    const favorites = Array.from(cityMap.values());
    
    console.log(`[FavoritesUpdateService] Found ${favorites.length} unique favorites to update out of ${validItems.length} valid items (${allItems.length} total)`);
    
    if (favorites.length === 0) {
      return 0;
    }
    
    // Process favorites in batches to not overwhelm the API
    const batchSize = 3;
    let successCount = 0;
    
    for (let i = 0; i < favorites.length; i += batchSize) {
      const batch = favorites.slice(i, i + batchSize);
      
      // Update batch in parallel
      const results = await Promise.allSettled(
        batch.map(async (favorite: FavoriteItem) => {
          try {
            // Extract geo data from metadata if available
            let lat, lon, country;
            
            try {
              const metadata = JSON.parse(favorite.metadata);
              if (metadata.lat) lat = metadata.lat;
              if (metadata.lon) lon = metadata.lon;
              if (metadata.country) country = metadata.country;
            } catch (e) {
              console.error(`[FavoritesUpdateService] Error parsing metadata for ${favorite.name}:`, e);
            }
            
            // If we don't have lat/lon, try to fetch it
            if (!lat || !lon) {
              console.log(`[FavoritesUpdateService] Missing geo data for ${favorite.name}, attempting to fetch it`);
              const cityGeoData = await getGeoDataForCity(favorite.name);
              
              if (cityGeoData) {
                // Found geo data, use it
                lat = cityGeoData.lat;
                lon = cityGeoData.lon;
                country = cityGeoData.country;
                
                console.log(`[FavoritesUpdateService] Retrieved geo data for ${favorite.name}: (${lat}, ${lon})`);
              } else {
                console.log(`[FavoritesUpdateService] Could not find geo data for ${favorite.name}, skipping update`);
                return false;
              }
            }
            
            // Create City object for the weather service
            const city: City = {
              name: favorite.name,
              lat,
              lon,
              country: country || 'Unknown'
            };
            
            // Fetch fresh weather data
            console.log(`[FavoritesUpdateService] Fetching fresh weather for ${city.name}`);
            const weatherData = await fetchWeatherFromApi(city);
            
            // Convert to favorite format
            const favoriteData: FavoriteWeatherData = {
              id: favorite.id, // Keep existing ID to update not create
              city: weatherData.city,
              temperature: weatherData.temperature,
              conditions: weatherData.conditions,
              humidity: weatherData.humidity,
              windSpeed: weatherData.windSpeed,
              icon: weatherData.icon,
              description: weatherData.description,
              weatherId: weatherData.weatherId,
              lat: weatherData.lat,
              lon: weatherData.lon,
              country: weatherData.country
            };
            
            // Save updated data
            console.log(`[FavoritesUpdateService] Saving updated data for ${city.name}`);
            await saveFavoriteCity(favoriteData);
            
            return true;
          } catch (error) {
            console.error(`[FavoritesUpdateService] Error updating ${favorite.name}:`, error);
            return false;
          }
        })
      );
      
      // Count successful updates
      successCount += results.filter(result => 
        result.status === 'fulfilled' && result.value === true
      ).length;
      
      // Small delay between batches
      if (i + batchSize < favorites.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`[FavoritesUpdateService] Updated ${successCount}/${favorites.length} favorites successfully`);
    return successCount;
  } catch (error) {
    console.error('[FavoritesUpdateService] Error updating favorites:', error);
    return 0;
  }
}; 