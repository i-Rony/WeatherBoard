import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Alert,
  Dimensions,
  Platform
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apolloClient, LIST_ITEMS } from '../api/graphql';
import { useAuth } from '../context/AuthContext';
import { updateAllFavorites } from '../services/FavoritesUpdateService';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Text } from '../components/ui';

// Import our animation components
import CloudAnimation from '../components/CloudAnimation';

const { width } = Dimensions.get('window');

type RootStackParamList = {
  Home: undefined;
  Favorites: undefined;
  CityDetail: { cityId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Interface for weather metadata from GraphQL
interface WeatherMetadata {
  temperature: number;
  humidity: number;
  windSpeed: number;
  conditions: string;
  icon: string;
  description: string;
  weatherId?: number;
}

// Interface for favorite city item
interface FavoriteItem {
  id: string;
  name: string;
  content: string;
  metadata: string; // JSON string that will be parsed
  createdAt: string;
  updatedAt: string;
  parsedMetadata?: WeatherMetadata; // For convenience after parsing
}

const FavoritesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  // Function to parse metadata JSON strings into objects
  const processFavorites = (items: FavoriteItem[]): FavoriteItem[] => {
    // First, filter out deleted items and parse metadata
    const validItems = items
      .map(item => {
        try {
          // Parse the metadata JSON string
          const parsedMetadata = JSON.parse(item.metadata) as WeatherMetadata;
          // Return item with parsed metadata
          return {
            ...item,
            parsedMetadata
          };
        } catch (e) {
          console.error('[Favorites] Error parsing metadata for item:', item.id, e);
          // Return item without parsed metadata if there's an error
          return item;
        }
      })
      // Filter out items marked as deleted
      .filter(item => {
        if (!item.parsedMetadata) return false;
        
        // Skip items with empty content or marked as deleted
        if (item.content === "" || 
            (item.parsedMetadata as any).deleted === true) {
          console.log(`[Favorites] Filtering out deleted item: ${item.name}`);
          return false;
        }
        
        return true;
      });
      
    // Now deduplicate cities by name
    // Keep the most recently updated item for each city
    const cityMap = new Map<string, FavoriteItem>();
    
    validItems.forEach(item => {
      const cityName = item.name.toLowerCase();
      const weatherId = item.parsedMetadata?.weatherId || 0;
      // Create a composite key with city name and weather ID for uniqueness
      const key = `${cityName}-${weatherId}`;
      
      if (!cityMap.has(key) || 
          new Date(item.updatedAt) > new Date(cityMap.get(key)!.updatedAt)) {
        // Keep the most recent item
        cityMap.set(key, item);
      }
    });
    
    // Convert map back to array
    const uniqueItems = Array.from(cityMap.values());
    
    console.log(`[Favorites] Removed ${validItems.length - uniqueItems.length} duplicate favorites`);
    return uniqueItems;
  };

  // Fetch favorites from GraphQL API
  const fetchFavorites = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    setError(null);
    
    try {
      console.log('[Favorites] Fetching favorites list...');
      
      // If this is a manual refresh, update all favorites with fresh weather data
      if (isRefreshing) {
        console.log('[Favorites] Refreshing favorites with current weather data');
        try {
          await updateAllFavorites();
        } catch (updateError) {
          console.error('[Favorites] Error updating favorites weather data:', updateError);
          // Continue with fetch even if update fails
        }
      }
      
      const response = await apolloClient.query({
        query: LIST_ITEMS,
        fetchPolicy: 'network-only' // Skip cache to always get fresh data
      });
      
      console.log('[Favorites] Fetch response received');
      
      const items = response.data.listItems || [];
      const processedItems = processFavorites(items);
      setFavorites(processedItems);
      
      console.log('[Favorites] Processed', processedItems.length, 'favorite items');
      
    } catch (error: any) {
      console.error('[Favorites] Error fetching favorites:', error);
      setError('Failed to load favorites. ' + (error.message || ''));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Show details for a favorite city
  const handleViewDetails = (item: FavoriteItem) => {
    // Navigate to the detailed city view
    navigation.navigate('CityDetail', { cityId: item.id });
  };

  // Pull-to-refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFavorites(true);
  }, []);

  // Refresh favorites when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('[Favorites] Screen focused, refreshing data');
      if (isAuthenticated) {
        // Use a short timeout to prevent UI jank during navigation
        const timer = setTimeout(() => {
          fetchFavorites();
        }, 300);
        
        return () => clearTimeout(timer);
      }
    }, [isAuthenticated])
  );

  // Fetch favorites when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
    } else {
      setError('Please log in to view your favorites.');
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Render item for FlatList
  const renderFavoriteItem = ({ item }: { item: FavoriteItem }) => {
    // Skip rendering if we couldn't parse the metadata
    if (!item.parsedMetadata) return null;
    
    const metadata = item.parsedMetadata;
    
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => handleViewDetails(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cityInfo}>
            <Ionicons name="location" size={20} color="white" />
            <Text variant="h3" style={styles.cityName}>{item.name}</Text>
          </View>
          <Image
            style={styles.weatherIcon}
            source={{
              uri: `https://openweathermap.org/img/wn/${metadata.icon}@2x.png`
            }}
          />
        </View>
        
        <View style={styles.cardBody}>
          <Text variant="h1" style={styles.temperature}>{metadata.temperature}°</Text>
          <Text variant="body" style={styles.conditions}>{metadata.conditions}</Text>
        </View>
        
        <View style={styles.cardFooter}>
          <View style={styles.detailItem}>
            <Ionicons name="water-outline" size={16} color="rgba(255, 255, 255, 0.8)" />
            <Text variant="bodySmall" style={styles.detailText}>
              {metadata.humidity}%
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="speedometer-outline" size={16} color="rgba(255, 255, 255, 0.8)" />
            <Text variant="bodySmall" style={styles.detailText}>
              {metadata.windSpeed} m/s
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background gradient */}
      <LinearGradient
        colors={['#3498db', '#2c3e50'] as const}
        style={styles.background}
      />
      
      {/* Weather animation background */}
      <View style={styles.animationContainer}>
        <CloudAnimation count={6} />
      </View>
      
      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="white" />
          <Text variant="body" style={styles.loadingText}>Loading favorites...</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={favorites}
          renderItem={renderFavoriteItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              <Text variant="h1" style={styles.headerTitle}>Your Favorites</Text>
              <TouchableOpacity 
                style={styles.homeButton}
                onPress={() => navigation.navigate('Home')}
              >
                <Ionicons name="home" size={24} color="white" />
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            error ? (
              <View style={styles.messageContainer}>
                <Ionicons name="alert-circle" size={40} color="white" />
                <Text variant="body" style={styles.errorText}>{error}</Text>
              </View>
            ) : (
              <View style={styles.messageContainer}>
                <Ionicons name="heart" size={40} color="white" />
                <Text variant="h3" style={styles.emptyText}>
                  You don't have any favorite cities yet.
                </Text>
                <Text variant="body" style={styles.emptySubText}>
                  Add favorites from the weather screen.
                </Text>
                <TouchableOpacity 
                  style={styles.goHomeButton}
                  onPress={() => navigation.navigate('Home')}
                >
                  <Text variant="body" weight="medium" style={styles.goHomeButtonText}>Go to Weather</Text>
                </TouchableOpacity>
              </View>
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['white']}
              tintColor="white"
              progressBackgroundColor="rgba(255, 255, 255, 0.2)"
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  animationContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.7,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: Platform.OS === 'ios' ? 60 : 40,
    marginBottom: 16,
  },
  headerTitle: {
    color: 'white',
  },
  homeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: 'white',
  },
  messageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 30,
  },
  errorText: {
    marginTop: 10,
    color: 'white',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 16,
    color: 'white',
    textAlign: 'center',
  },
  emptySubText: {
    marginTop: 8,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  goHomeButton: {
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  goHomeButtonText: {
    color: 'white',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 15,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cityName: {
    color: 'white',
    marginLeft: 6,
  },
  weatherIcon: {
    width: 50,
    height: 50,
  },
  cardBody: {
    marginBottom: 10,
  },
  temperature: {
    color: 'white',
  },
  conditions: {
    color: 'white',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  detailText: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 4,
  },
});

export default FavoritesScreen; 