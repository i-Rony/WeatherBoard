import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Platform
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { apolloClient, GET_ITEM } from '../api/graphql';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Text } from '../components/ui';

// Import weather animations
import RainAnimation from '../components/RainAnimation';
import CloudAnimation from '../components/CloudAnimation';
import SunAnimation from '../components/SunAnimation';
import NightAnimation from '../components/NightAnimation';
import SnowAnimation from '../components/SnowAnimation';
import ThunderstormAnimation from '../components/ThunderstormAnimation';

const { width } = Dimensions.get('window');

// Define the navigation param list
type RootStackParamList = {
  Home: undefined;
  Favorites: undefined;
  CityDetail: { cityId: string };
};

// Types for navigation
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type CityDetailRouteProp = RouteProp<RootStackParamList, 'CityDetail'>;

// Weather metadata interface
interface WeatherMetadata {
  temperature: number;
  humidity: number;
  windSpeed: number;
  conditions: string;
  icon: string;
  description: string;
  weatherId?: number;
  timezone?: number;
  sunrise?: number;
  sunset?: number;
}

// Favorite item interface
interface FavoriteItem {
  id: string;
  name: string;
  content: string;
  metadata: WeatherMetadata;
  createdAt: string;
  updatedAt: string;
}

const CityDetailScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CityDetailRouteProp>();
  const { cityId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cityData, setCityData] = useState<FavoriteItem | null>(null);

  // Fetch city data using getItem query
  useEffect(() => {
    const fetchCityData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('[CityDetail] Fetching city data for ID:', cityId);
        
        const response = await apolloClient.query({
          query: GET_ITEM,
          variables: { id: cityId },
          fetchPolicy: 'network-only' // Skip cache to get fresh data
        });
        
        if (!response.data.getItem) {
          throw new Error('City not found');
        }
        
        // Parse metadata if it's a string
        let item = response.data.getItem;
        if (typeof item.metadata === 'string') {
          item = {
            ...item,
            metadata: JSON.parse(item.metadata)
          };
        }
        
        setCityData(item);
        console.log('[CityDetail] City data loaded successfully');
      } catch (error: any) {
        console.error('[CityDetail] Error fetching city data:', error);
        setError('Failed to load city data: ' + (error.message || ''));
      } finally {
        setLoading(false);
      }
    };
    
    fetchCityData();
  }, [cityId]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Function to determine background gradient based on weather
  const getBackgroundGradient = () => {
    if (!cityData || !cityData.metadata) {
      return ['#3498db', '#2c3e50'] as const; 
    }
    
    const conditions = cityData.metadata.conditions.toLowerCase();
    
    // Check icon for day/night indicator
    const forceDaytime = cityData.metadata.icon && cityData.metadata.icon.includes('d');
    const forceNighttime = cityData.metadata.icon && cityData.metadata.icon.includes('n');
    
    // Use icon-based time if available, otherwise calculate
    let isNight = forceNighttime;
    if (!forceDaytime && !forceNighttime) {
      isNight = getIsNightInCity(cityData.metadata);
    }
    
    console.log(`[CityDetail] Gradient for ${cityData.name}: conditions=${conditions}, icon=${cityData.metadata.icon}, isNight=${isNight}`);
    
    if (conditions.includes('thunderstorm')) {
      return isNight ?
        ['#1a1a2e', '#16213e'] as const : // Very dark blue for night thunderstorm
        ['#4b6cb7', '#182848'] as const; // Dark blue for day thunderstorm
    } else if (conditions.includes('snow')) {
      return isNight ? 
        ['#061224', '#132b4c'] as const : // Deeper blue for night snow
        ['#a7c8e7', '#7aa5c9'] as const; // Deeper blue for day snow
    } else if (conditions.includes('rain') || conditions.includes('drizzle')) {
      return isNight ?
        ['#0F2027', '#203A43'] as const : // Dark slate for night rain
        ['#3a7bd5', '#3a6073'] as const; // Medium blue for day rain
    } else if (conditions.includes('mist') || conditions.includes('fog') || 
               conditions.includes('haze') || conditions.includes('smoke')) {
      return isNight ?
        ['#2c3e50', '#4ca1af'] as const : // Dark teal for night mist
        ['#bdc3c7', '#2c3e50'] as const; // Light gray for day mist
    } else if (conditions.includes('cloud')) {
      return isNight ?
        ['#1c2841', '#404e68'] as const : // Deeper blue-gray for night clouds
        ['#5b6d95', '#8ba3c7'] as const; // Softer blue for day clouds
    } else {
      // Clear or sunny
      return isNight ?
        ['#0F2027', '#203A43'] as const : // Dark blue for night clear
        ['#2980B9', '#6DD5FA'] as const; // Blue for day clear
    }
  };

  // Function to check if it's night time in the city
  const getIsNightInCity = (metadata: WeatherMetadata): boolean => {
    // Debug the timezone data
    console.log('[CityDetail] Checking day/night for:', cityData?.name);
    console.log('[CityDetail] Timezone data:', metadata.timezone);
    console.log('[CityDetail] Sunrise:', metadata.sunrise);
    console.log('[CityDetail] Sunset:', metadata.sunset);
    
    if (!metadata.timezone) {
      // Fallback to local time if timezone data is not available
      console.log('[CityDetail] No timezone data, using local time');
      const timeOfDay = new Date().getHours();
      console.log('[CityDetail] Local hour:', timeOfDay);
      return timeOfDay < 6 || timeOfDay > 18;
    }

    // Get current UTC time in seconds
    const now = Math.floor(Date.now() / 1000);
    
    // Calculate current time in target location (Unix timestamp)
    const localTime = now + metadata.timezone;
    
    // Check if current time is outside sunrise-sunset range
    if (metadata.sunrise && metadata.sunset) {
      console.log('[CityDetail] Current time (unix):', now);
      console.log('[CityDetail] Local time in city (unix):', localTime);
      console.log('[CityDetail] Is night time?', (localTime < metadata.sunrise || localTime > metadata.sunset));
      
      // For New York or cities in America, double-check the calculation
      if (cityData?.name.includes('New York') || (cityData?.name && /USA|United States|America/i.test(cityData.name))) {
        // Get the current hour in the city using JS Date
        const cityDate = new Date(localTime * 1000);
        const cityHours = cityDate.getUTCHours();
        console.log('[CityDetail] New York hour (UTC calculation):', cityHours);
        
        // Force daytime for debugging if needed
        // During morning hours in US Eastern time (~6am-6pm ET / ~11-23 UTC)
        if (cityHours >= 11 && cityHours < 23) {
          console.log('[CityDetail] Forcing daytime for New York morning hours');
          return false;
        }
      }
      
      return localTime < metadata.sunrise || localTime > metadata.sunset;
    }
    
    // Fallback: create date object in location's timezone
    const cityDate = new Date(localTime * 1000);
    const cityHours = cityDate.getUTCHours();
    console.log('[CityDetail] City hour (UTC calculation):', cityHours);
    
    // For US cities specifically, double check the calculation
    if (cityData?.name.includes('New York') || (cityData?.name && /USA|United States|America/i.test(cityData.name))) {
      // New York is ~5 hours behind UTC, so during US daytime, UTC is generally 11-23
      if (cityHours >= 11 && cityHours < 23) {
        console.log('[CityDetail] Detected US Eastern daytime');
        return false;
      }
    }
    
    return cityHours < 6 || cityHours > 18;
  };

  // Function to render weather animation based on condition
  const renderWeatherAnimation = () => {
    if (!cityData || !cityData.metadata) return null;
    
    const conditions = cityData.metadata.conditions.toLowerCase();
    const isNight = getIsNightInCity(cityData.metadata);
    
    console.log(`[CityDetail] Rendering animation for ${cityData.name}, conditions: ${conditions}, isNight: ${isNight}`);
    
    // Special case handling for daylight/sunny conditions
    // If the weather conditions indicate clear skies or sun, and the icon contains "d" (day),
    // force the daytime animation regardless of calculated time
    if ((conditions.includes('clear') || conditions.includes('sun')) && 
        cityData.metadata.icon && cityData.metadata.icon.includes('d')) {
      console.log('[CityDetail] Icon indicates daytime, forcing sun animation');
      return <SunAnimation />;
    }
    
    if (conditions.includes('thunderstorm')) {
      return <ThunderstormAnimation />;
    } else if (conditions.includes('drizzle') || conditions.includes('rain')) {
      return <RainAnimation count={100} speed={5000} opacity={1.0} />;
    } else if (conditions.includes('snow')) {
      return <SnowAnimation count={100} speed={15000} opacity={1.0} />;
    } else if (conditions.includes('mist') || conditions.includes('fog') || 
               conditions.includes('haze') || conditions.includes('smoke')) {
      return isNight ? 
        <><NightAnimation starCount={10} /><CloudAnimation count={6} color="rgba(255, 255, 255, 0.9)" /></> :
        <CloudAnimation count={6} color="rgba(255, 255, 255, 0.9)" />;
    } else if (conditions.includes('clear') || conditions.includes('sun')) {
      return isNight ? <NightAnimation /> : <SunAnimation />;
    } else if (conditions.includes('cloud')) {
      return isNight ? 
        <><NightAnimation starCount={20} /><CloudAnimation count={4} color="rgba(255, 255, 255, 0.9)" /></> :
        <CloudAnimation count={4} color="rgba(255, 255, 255, 0.9)" />;
    }
    
    // Default: show night or clouds based on time
    return isNight ? <NightAnimation /> : <CloudAnimation count={2} color="rgba(255, 255, 255, 0.9)" />;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background gradient */}
      <LinearGradient
        colors={getBackgroundGradient()}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      
      {/* Weather animation */}
      <View style={styles.animationContainer}>
        {renderWeatherAnimation()}
      </View>
      
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="white" />
          <Text variant="body" style={styles.loadingText}>Loading city details...</Text>
        </View>
      ) : error || !cityData ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={40} color="white" />
          <Text variant="body" style={styles.errorText}>{error || 'Failed to load city data'}</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text variant="body" weight="medium" style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButtonContainer}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          {/* Content */}
          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <View style={styles.cityNameContainer}>
                <Ionicons name="location" size={24} color="white" />
                <Text variant="h1" style={styles.cityName}>{cityData.name}</Text>
              </View>
              <Image
                style={styles.weatherIcon}
                source={{
                  uri: `https://openweathermap.org/img/wn/${cityData.metadata.icon}@4x.png`
                }}
              />
            </View>
            
            <View style={styles.glassCard}>
              <Text variant="h1" style={styles.temperature}>{cityData.metadata.temperature}°</Text>
              <Text variant="h2" style={styles.conditions}>{cityData.metadata.conditions}</Text>
              <Text variant="body" style={styles.description}>{cityData.metadata.description}</Text>
            </View>
            
            <View style={styles.glassCard}>
              <Text variant="h3" style={styles.cardTitle}>Weather Details</Text>
              
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Ionicons name="water-outline" size={24} color="white" />
                  <Text variant="bodySmall" style={styles.detailLabel}>Humidity</Text>
                  <Text variant="body" weight="bold" style={styles.detailValue}>{cityData.metadata.humidity}%</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Ionicons name="speedometer-outline" size={24} color="white" />
                  <Text variant="bodySmall" style={styles.detailLabel}>Wind Speed</Text>
                  <Text variant="body" weight="bold" style={styles.detailValue}>{cityData.metadata.windSpeed} m/s</Text>
                </View>
              </View>
              
              {cityData.metadata.weatherId && (
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Ionicons name="id-card-outline" size={24} color="white" />
                    <Text variant="bodySmall" style={styles.detailLabel}>Weather ID</Text>
                    <Text variant="body" weight="bold" style={styles.detailValue}>{cityData.metadata.weatherId}</Text>
                  </View>
                </View>
              )}
            </View>
            
            <View style={styles.glassCard}>
              <Text variant="h3" style={styles.cardTitle}>Favorite Information</Text>
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={20} color="rgba(255, 255, 255, 0.8)" />
                <Text variant="bodySmall" style={styles.infoLabel}>Added:</Text>
                <Text variant="bodySmall" style={styles.infoValue}>{formatDate(cityData.createdAt)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="refresh-outline" size={20} color="rgba(255, 255, 255, 0.8)" />
                <Text variant="bodySmall" style={styles.infoLabel}>Updated:</Text>
                <Text variant="bodySmall" style={styles.infoValue}>{formatDate(cityData.updatedAt)}</Text>
              </View>
            </View>
          </ScrollView>
        </>
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
    opacity: 1,
    zIndex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 2,
  },
  loadingText: {
    marginTop: 10,
    color: 'white',
  },
  errorText: {
    marginTop: 10,
    color: 'white',
    textAlign: 'center',
  },
  backButton: {
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
  backButtonText: {
    color: 'white',
  },
  backButtonContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  scrollContainer: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 50 : 30,
    zIndex: 2,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 50,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cityNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cityName: {
    color: 'white',
    marginLeft: 8,
  },
  weatherIcon: {
    width: 150,
    height: 150,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
  temperature: {
    color: 'white',
    textAlign: 'center',
  },
  conditions: {
    color: 'white',
    textAlign: 'center',
    marginVertical: 5,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  cardTitle: {
    color: 'white',
    marginBottom: 15,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  detailValue: {
    color: 'white',
    marginTop: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 8,
    marginRight: 8,
  },
  infoValue: {
    color: 'white',
  },
});

export default CityDetailScreen; 