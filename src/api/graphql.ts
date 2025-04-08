import { ApolloClient, InMemoryCache, gql, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Token storage key (must match the key used in AuthContext)
const TOKEN_STORAGE_KEY = 'secure_user_token';

// Create HTTP link
const httpLink = createHttpLink({
  uri: process.env.EXPO_PUBLIC_GRAPHQL_ENDPOINT
});

// Add authentication to your requests
const authLink = setContext(async (_, { headers }) => {
  // Get the authentication token from AsyncStorage
  const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  console.log('[GraphQL] Retrieved token from AsyncStorage:', token ? 'Token exists' : 'No token');
  
  // Return the headers with the token
  return {
    headers: {
      ...headers,
      Authorization: token || '',
    }
  };
});

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache()
});

console.log('[GraphQL] Apollo Client initialized with endpoint:', process.env.EXPO_PUBLIC_GRAPHQL_ENDPOINT);
console.log('[GraphQL] Authentication via AsyncStorage configured');

// GraphQL operations
export const UPSERT_ITEM = gql`
  mutation UpsertItem($input: ItemInput!) {
    upsertItem(input: $input) {
      id
      name
      content
      metadata
      createdAt
      updatedAt
    }
  }
`;

export const LIST_ITEMS = gql`
  query ListItems {
    listItems {
      id
      name
      content
      metadata
      createdAt
      updatedAt
    }
  }
`;

export const GET_ITEM = gql`
  query GetItem($id: ID!) {
    getItem(id: $id) {
      id
      name
      content
      metadata
      createdAt
      updatedAt
    }
  }
`;

// Interface for favorite weather data
export interface FavoriteWeatherData {
  id?: string;       // This will now be the OpenWeather city ID
  city: string;
  temperature: number;
  conditions: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  description: string;
  weatherId?: number; // OpenWeather ID
  lat?: number;       // Latitude for geo data
  lon?: number;       // Longitude for geo data
  country?: string;   // Country code
  timezone?: number;  // Timezone offset in seconds
  sunrise?: number;   // Sunrise time (Unix, UTC)
  sunset?: number;    // Sunset time (Unix, UTC)
}

// Function to save a city as a favorite
export const saveFavoriteCity = async (weatherData: FavoriteWeatherData) => {
  console.log('[GraphQL] Saving favorite city:', weatherData.city);
  
  try {
    // Create a summary for the content field
    const content = JSON.stringify({
      temperature: weatherData.temperature,
      conditions: weatherData.conditions,
      description: weatherData.description
    });

    // Create metadata with all weather details
    const metadata = JSON.stringify({
      temperature: weatherData.temperature,
      conditions: weatherData.conditions,
      humidity: weatherData.humidity,
      windSpeed: weatherData.windSpeed,
      icon: weatherData.icon,
      description: weatherData.description,
      weatherId: weatherData.weatherId,
      lat: weatherData.lat,      // Add latitude
      lon: weatherData.lon,      // Add longitude
      country: weatherData.country, // Add country
      timezone: weatherData.timezone, // Add timezone offset
      sunrise: weatherData.sunrise,   // Add sunrise time
      sunset: weatherData.sunset      // Add sunset time
    });

    // Prepare input for mutation
    const input: {
      id?: string;
      name: string;
      content: string;
      metadata: string;
    } = {
      name: weatherData.city,
      content,
      metadata
    };

    // Include ID if it exists (for updating existing items)
    if (weatherData.id) {
      input.id = weatherData.id;
    }

    console.log('[GraphQL] Sending mutation with input:', JSON.stringify(input));
    
    // Double-check token right before mutation
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    console.log('[GraphQL] Using token for request:', token ? 'Token exists' : 'No token');

    // Execute the mutation
    const response = await apolloClient.mutate({
      mutation: UPSERT_ITEM,
      variables: { input }
    });

    console.log('[GraphQL] Mutation response:', JSON.stringify(response));
    
    return response.data.upsertItem;
  } catch (error: any) {
    console.error('[GraphQL] Error saving favorite city:', error);
    console.error('[GraphQL] Error message:', error.message || 'No error message');
    
    if (error.networkError) {
      console.error('[GraphQL] Network error:', error.networkError);
      if (error.networkError.statusCode) {
        console.error('[GraphQL] Network error status:', error.networkError.statusCode);
      }
      if (error.networkError.bodyText) {
        console.error('[GraphQL] Network error body:', error.networkError.bodyText);
      }
    }
    
    if (error.graphQLErrors) {
      console.error('[GraphQL] GraphQL errors:', JSON.stringify(error.graphQLErrors));
    }
    
    throw error;
  }
};

// Function to check if a city is in favorites
export const checkIfCityInFavorites = async (cityName: string, weatherId?: number) => {
  console.log('[GraphQL] Checking if city is in favorites:', cityName);
  
  try {
    const response = await apolloClient.query({
      query: LIST_ITEMS,
      fetchPolicy: 'network-only' // Skip cache to get fresh data
    });
    
    const items = response.data.listItems || [];
    
    // Check if the city name matches any favorite that's not marked as deleted
    const isFavorite = items.some((item: any) => {
      if (item.name.toLowerCase() !== cityName.toLowerCase()) {
        return false;
      }
      
      // Check if item is marked as deleted
      try {
        const metadata = JSON.parse(item.metadata);
        if (item.content === "" || metadata.deleted === true) {
          return false; // Skip deleted items
        }
        
        // If weatherId is provided, check if it matches
        if (weatherId && metadata.weatherId) {
          // If weather ID doesn't match, this is a different city with the same name
          if (metadata.weatherId !== weatherId) {
            return false;
          }
        }
      } catch (e) {
        // If we can't parse metadata, continue with the check
      }
      
      return true;
    });
    
    console.log('[GraphQL] Is city in favorites:', isFavorite);
    return isFavorite;
  } catch (error) {
    console.error('[GraphQL] Error checking if city is in favorites:', error);
    return false; // Default to not a favorite if there's an error
  }
}; 