import { saveFavoriteCity, checkIfCityInFavorites, FavoriteWeatherData } from '../api/graphql';
import { WeatherData } from './WeatherService';
import { apolloClient, LIST_ITEMS, UPSERT_ITEM } from '../api/graphql';

/**
 * Convert WeatherData to the format expected by the GraphQL API
 */
const convertToFavoriteData = (weather: WeatherData): FavoriteWeatherData => {
  // Find geo data from city property (expected format: "CityName")
  let lat, lon, country;
  
  // Access geo data from the originating City object if available
  // This data should be passed through the WeatherService
  if (weather.lat !== undefined && weather.lon !== undefined) {
    lat = weather.lat;
    lon = weather.lon;
    country = weather.country || 'Unknown';
  }
  
  return {
    city: weather.city,
    temperature: weather.temperature,
    conditions: weather.conditions,
    humidity: weather.humidity,
    windSpeed: weather.windSpeed,
    icon: weather.icon,
    description: weather.description,
    weatherId: weather.weatherId,
    lat,
    lon,
    country,
    timezone: weather.timezone,
    sunrise: weather.sunrise,
    sunset: weather.sunset
  };
};

/**
 * Check if a city is in the user's favorites
 * @param cityName The name of the city to check
 * @param weatherId Optional weather ID for more accurate matching
 * @returns Promise<boolean> true if city is in favorites
 */
export const isCityInFavorites = async (cityName: string, weatherId?: number): Promise<boolean> => {
  try {
    console.log(`[FavoritesService] Checking if ${cityName} is in favorites${weatherId ? ` with weather ID ${weatherId}` : ''}`);
    return await checkIfCityInFavorites(cityName, weatherId);
  } catch (error) {
    console.error('[FavoritesService] Error checking favorite status:', error);
    return false;
  }
};

/**
 * Toggle a city's favorite status (add if not present, update if present)
 * @param weatherData The weather data to save as favorite
 * @returns Promise<boolean> true if operation was successful
 */
export const toggleFavorite = async (weatherData: WeatherData): Promise<boolean> => {
  try {
    console.log(`[FavoritesService] Toggling favorite for ${weatherData.city}`);
    
    // Check if this city is already in favorites
    const isAlreadyFavorite = await isCityInFavorites(weatherData.city, weatherData.weatherId);
    
    if (isAlreadyFavorite) {
      console.log(`[FavoritesService] City ${weatherData.city} is already a favorite, removing it`);
      
      // Get the list of favorites to find matching items
      const response = await apolloClient.query({
        query: LIST_ITEMS,
        fetchPolicy: 'network-only' // Skip cache to get fresh data
      });
      
      const items = response.data.listItems || [];
      let removedCount = 0;
      
      // Find ALL items with matching city name or weather ID
      const matchingItems = items.filter((item: any) => {
        // Check city name match
        const nameMatches = item.name.toLowerCase() === weatherData.city.toLowerCase();
        let weatherIdMatches = false;
        
        // Also check weatherId if available
        try {
          const metadata = JSON.parse(item.metadata);
          if (weatherData.weatherId && metadata.weatherId) {
            weatherIdMatches = metadata.weatherId === weatherData.weatherId;
          }
        } catch (e) {
          // If parsing fails, just rely on name matching
        }
        
        // Skip already deleted items
        try {
          const metadata = JSON.parse(item.metadata);
          if (item.content === "" || metadata.deleted === true) {
            return false;
          }
        } catch (e) {
          // Continue with the check if parsing fails
        }
        
        return nameMatches || weatherIdMatches;
      });
      
      console.log(`[FavoritesService] Found ${matchingItems.length} matching favorites to remove`);
      
      // Remove all matching items
      if (matchingItems.length > 0) {
        await Promise.all(matchingItems.map(async (item: any) => {
          // Mark as deleted
          const emptyInput = {
            id: item.id,
            name: item.name,
            content: "",
            metadata: JSON.stringify({
              deleted: true,
              deletedAt: new Date().toISOString(),
              originalWeatherId: weatherData.weatherId,
              originalCityName: weatherData.city
            })
          };
          
          console.log(`[FavoritesService] Marking favorite as deleted with ID: ${item.id}`);
          
          try {
            await apolloClient.mutate({
              mutation: UPSERT_ITEM,
              variables: { input: emptyInput }
            });
            removedCount++;
          } catch (err) {
            console.error(`[FavoritesService] Error removing favorite with ID ${item.id}:`, err);
          }
        }));
        
        console.log(`[FavoritesService] Successfully removed ${removedCount}/${matchingItems.length} favorites`);
        return removedCount > 0;
      } else {
        console.error(`[FavoritesService] Could not find favorites to remove for: ${weatherData.city}`);
        return false;
      }
    } else {
      // Not a favorite yet, add it
      console.log(`[FavoritesService] Adding new favorite: ${weatherData.city}`);
      
      // Convert to the format expected by the GraphQL API
      const favoriteData = convertToFavoriteData(weatherData);
      
      // Save using GraphQL API
      await saveFavoriteCity(favoriteData);
      
      return true; // Successfully added
    }
  } catch (error) {
    console.error('[FavoritesService] Error toggling favorite:', error);
    
    // Log detailed error information for debugging
    if (error instanceof Error) {
      console.error('[FavoritesService] Error details:', error.message);
      console.error('[FavoritesService] Error stack:', error.stack);
    }
    
    const anyError = error as any;
    if (anyError.networkError) {
      console.error('[FavoritesService] Network error:', anyError.networkError);
    }
    
    if (anyError.graphQLErrors) {
      console.error('[FavoritesService] GraphQL errors:', JSON.stringify(anyError.graphQLErrors));
    }
    
    return false;
  }
}; 