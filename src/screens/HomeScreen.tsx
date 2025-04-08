import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Image,
  Alert,
  Platform,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { searchCities, City, addToRecentSearches } from '../services/GeoService';
import { getWeatherData, WeatherData, processPendingRequests, clearAllWeatherCache } from '../services/WeatherService';
import { toggleFavorite, isCityInFavorites } from '../services/FavoritesService';
import { isInternetAvailable } from '../utils/NetworkUtils';
import { debounce } from '../utils/PerformanceUtils';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, TextInput } from '../components/ui';
import MapView, { Marker, PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';

// Import our custom animation components
import RainAnimation from '../components/RainAnimation';
import CloudAnimation from '../components/CloudAnimation';
import SunAnimation from '../components/SunAnimation';
import NightAnimation from '../components/NightAnimation';
import SnowAnimation from '../components/SnowAnimation';
import ThunderstormAnimation from '../components/ThunderstormAnimation';

// Five minutes in milliseconds
const WEATHER_CACHE_EXPIRATION = 5 * 60 * 1000;
const { width, height } = Dimensions.get('window');

// Navigation type
type RootStackParamList = {
  HomeTabs: undefined;
  CityDetail: { cityId: string };
  Favorites: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen = () => {
  const { logout } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const previousCityRef = useRef<City | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  // Weather map layer state
  const [weatherMapLayer, setWeatherMapLayer] = useState<string>('precipitation_new');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Background gradient animation
  const [gradientColors, setGradientColors] = useState<[string, string]>(['#59c0e8', '#1063ad']);
  
  // Update gradient colors when weather changes
  useEffect(() => {
    if (weather) {
      const newColors = getBackgroundGradient();
      setGradientColors([...newColors]);
    }
  }, [weather]);

  // Memoize the network status checking function
  const checkNetworkStatus = useCallback(async () => {
    const networkAvailable = await isInternetAvailable();
    setIsOnline(networkAvailable);
    return networkAvailable;
  }, []);

  // Memoized function for searching cities
  const handleSearchCities = useCallback(async (query: string) => {
    if (query.length < 2) {
      setCities([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      await checkNetworkStatus();
      const cityResults = await searchCities(query);
      setCities(cityResults);
      setShowDropdown(true);
    } catch (error) {
      setError('Error searching for cities');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [checkNetworkStatus]);

  // Create a debounced version of the search function
  const debouncedSearch = useMemo(() => 
    debounce((query: string) => {
      if (query) {
        handleSearchCities(query);
      }
    }, 500), 
    [handleSearchCities]
  );

  // Update search when query changes - using debounced function
  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  // Memoized function for fetching weather data
  const fetchWeather = useCallback(async (city: City, forceRefresh = false) => {
    const currentTime = Date.now();
    const timeSinceLastUpdate = currentTime - lastUpdateTimeRef.current;
    const isCacheExpired = timeSinceLastUpdate > WEATHER_CACHE_EXPIRATION || forceRefresh;
    
    // Skip if we're already loading 
    if (loading && !forceRefresh) {
      return;
    }
    
    // Skip only if it's exactly the same city object (with same lat/lon) and cache isn't expired
    const isSameCity = previousCityRef.current && 
      previousCityRef.current.name === city.name && 
      previousCityRef.current.country === city.country &&
      previousCityRef.current.lat === city.lat &&
      previousCityRef.current.lon === city.lon;
    
    if (isSameCity && !isCacheExpired) {
      console.log(`[HomeScreen] Using cached data for ${city.name} (cache age: ${Math.round(timeSinceLastUpdate/1000)}s)`);
      return;
    }
    
    // Log the refresh reason
    if (isSameCity && isCacheExpired) {
      console.log(`[HomeScreen] Cache ${forceRefresh ? 'refresh forced' : 'expired'} for ${city.name}, fetching fresh data`);
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const networkAvailable = await checkNetworkStatus();
      
      // Process any pending requests if we're online
      if (networkAvailable) {
        processPendingRequests().catch(console.error);
      }
      
      // Get weather data from service - always force fresh data from API
      const weatherData = await getWeatherData(city, true);
      
      if (weatherData) {
        // Store reference to current city
        previousCityRef.current = city;
        // Update last update timestamp
        lastUpdateTimeRef.current = Date.now();
        setWeather(weatherData);
        
        // Check if this city is already in favorites
        const cityFavoriteStatus = await isCityInFavorites(city.name, weatherData.weatherId);
        setIsFavorite(cityFavoriteStatus);
        
        // Add to recent searches
        await addToRecentSearches(city);

        // Fade in animation
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }).start();
      } else {
        let errorMsg = 'No weather data available';
        if (!networkAvailable) {
          errorMsg += ' (offline mode)';
        }
        setError(errorMsg);
      }
    } catch (error) {
      setError('Error fetching weather data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [loading, checkNetworkStatus]);

  // Optimize city selection function with useCallback
  const selectCity = useCallback((city: City) => {
    setShowDropdown(false);
    setSearchQuery(''); // Clear search field after selection
    fetchWeather(city, true); // Force refresh when selecting from search
  }, [fetchWeather]);
  
  // Memoized function for toggling favorites
  const handleToggleFavorite = useCallback(async () => {
    if (!weather) {
      console.log('[HomeScreen] Cannot save: missing weather data');
      return;
    }

    try {
      // The current state before toggling
      const wasFavorite = isFavorite;
      
      const success = await toggleFavorite(weather);
      
      if (success) {
        // Toggle the favorite UI state
        const newFavoriteState = !wasFavorite;
        setIsFavorite(newFavoriteState);
        
        // Show success notification
        Alert.alert(
          newFavoriteState ? 'Added to Favorites' : 'Removed from Favorites',
          `${weather.city} has been ${newFavoriteState ? 'added to' : 'removed from'} your favorites.`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error('Failed to toggle favorite');
      }
    } catch (error) {
      console.error('[HomeScreen] Error toggling favorite:', error);
      
      Alert.alert(
        'Error',
        'There was an error updating your favorites. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [weather, isFavorite]);

  // Function to handle going to favorites screen
  const goToFavorites = useCallback(() => {
    navigation.navigate('Favorites');
  }, [navigation]);

  // Check network status and process pending requests on component mount
  useEffect(() => {
    const initialize = async () => {
      const online = await checkNetworkStatus();
      
      // Process any pending requests if we're online
      if (online) {
        processPendingRequests().catch(console.error);
      }
    };
    
    initialize();
    
    // Add event listeners for online/offline status if on web
    if (Platform.OS === 'web') {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [checkNetworkStatus]);

  // Function to get background gradient based on weather
  const getBackgroundGradient = () => {
    if (!weather) return ['#59c0e8', '#1063ad'] as const;
    
    const conditions = weather.conditions.toLowerCase();
    
    // Check icon for day/night indicator
    const forceDaytime = weather.icon && weather.icon.includes('d');
    const forceNighttime = weather.icon && weather.icon.includes('n');
    
    // Use icon-based time if available, otherwise calculate
    let isNight = forceNighttime;
    if (!forceDaytime && !forceNighttime) {
      isNight = getIsNightInCity(weather);
    }
    
    if (conditions.includes('snow')) {
      return isNight ? 
        ['#061224', '#132b4c'] as const : // Deeper blue for night snow
        ['#a7c8e7', '#7aa5c9'] as const; // Deeper blue for day snow
    } else if (conditions.includes('rain') || conditions.includes('storm')) {
      return isNight ?
        ['#0F2027', '#203A43'] as const : // Dark slate for night rain
        ['#3a7bd5', '#3a6073'] as const; // Medium blue for day rain
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

  // Function to check if it's night time in the location
  const getIsNightInCity = (weather: WeatherData): boolean => {
    if (!weather.timezone) {
      // Fallback to local time if timezone data is not available
      const timeOfDay = new Date().getHours();
      return timeOfDay < 6 || timeOfDay > 18;
    }

    // Get current UTC time in seconds
    const now = Math.floor(Date.now() / 1000);
    
    // Calculate current time in target location (Unix timestamp)
    const localTime = now + weather.timezone;
    
    // Check if current time is outside sunrise-sunset range
    if (weather.sunrise && weather.sunset) {
      return localTime < weather.sunrise || localTime > weather.sunset;
    }
    
    // Fallback: create date object in location's timezone
    const cityDate = new Date(localTime * 1000);
    const cityHours = cityDate.getUTCHours();
    return cityHours < 6 || cityHours > 18;
  };

  // Function to render weather animation based on condition
  const renderWeatherAnimation = () => {
    if (!weather) return null;
    
    const conditions = weather.conditions.toLowerCase();
    
    // Check icon for day/night indicator
    const forceDaytime = weather.icon && weather.icon.includes('d');
    const forceNighttime = weather.icon && weather.icon.includes('n');
    
    // Use icon-based time if available, otherwise calculate
    let isNight = forceNighttime;
    if (!forceDaytime && !forceNighttime) {
      isNight = getIsNightInCity(weather);
    }
    
    console.log(`[HomeScreen] Weather animation for ${weather.city}: conditions=${conditions}, icon=${weather.icon}, isNight=${isNight}`);
    
    if (conditions.includes('thunderstorm')) {
      return <ThunderstormAnimation />;
    } else if (conditions.includes('drizzle') || conditions.includes('rain')) {
      return <RainAnimation count={80} speed={5000} />;
    } else if (conditions.includes('snow')) {
      return <SnowAnimation count={90} speed={15000} opacity={1.0} />;
    } else if (conditions.includes('mist') || conditions.includes('fog') || 
               conditions.includes('haze') || conditions.includes('smoke')) {
      return isNight ? 
        <><NightAnimation starCount={10} /><CloudAnimation count={6} /></> :
        <CloudAnimation count={6} />;
    } else if (conditions.includes('clear') || conditions.includes('sun')) {
      return isNight ? <NightAnimation /> : <SunAnimation />;
    } else if (conditions.includes('cloud')) {
      return isNight ? 
        <><NightAnimation starCount={20} /><CloudAnimation count={4} /></> :
        <CloudAnimation count={4} />;
    }
    
    // Default: show night or clouds based on time
    return isNight ? <NightAnimation /> : <CloudAnimation count={2} />;
  };

  // Function to handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    if (!previousCityRef.current) return;
    
    setRefreshing(true);
    try {
      await fetchWeather(previousCityRef.current, true);
    } finally {
      setRefreshing(false);
    }
  }, [fetchWeather]);

  // Header with favorites button
  const headerSection = (
    <View style={styles.header}>
      <Text variant="h1" style={styles.title}>Weather</Text>
      <View style={styles.headerButtons}>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => navigation.navigate('Favorites')}
        >
          <Text variant="body" weight="medium" style={styles.favoriteButtonText}>Favorites</Text>
          <Ionicons name="bookmark" size={18} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
        >
          <Ionicons name="log-out-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const getWeatherMapUrl = (lat: number, lon: number, zoom: number = 8) => {
    // Build OpenWeatherMap tile URL for weather conditions layer
    // Available layers: clouds, precipitation, pressure, wind, temp
    const apiKey = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
    return {
      uri: `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`
    };
  };

  // Custom map style with a lighter theme for better visibility of weather data
  const mapCustomStyle = [
    {
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#f5f5f5"
        }
      ]
    },
    {
      "elementType": "labels.icon",
      "stylers": [
        {
          "visibility": "off"
        }
      ]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#616161"
        }
      ]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#f5f5f5"
        }
      ]
    },
    {
      "featureType": "administrative.land_parcel",
      "stylers": [
        {
          "visibility": "off"
        }
      ]
    },
    {
      "featureType": "administrative.land_parcel",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#bdbdbd"
        }
      ]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#c9c9c9"
        }
      ]
    },
    {
      "featureType": "water",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#9e9e9e"
        }
      ]
    }
  ];

  // Weather map layers - using more distinct colors for better visualization
  const weatherLayers = [
    { id: 'precipitation_new', name: 'Rain', icon: 'rainy', color: '#2980B9' },
    { id: 'clouds_new', name: 'Clouds', icon: 'cloud', color: '#7F8C8D' },
    { id: 'temp_new', name: 'Temp', icon: 'thermometer', color: '#E74C3C' },
    { id: 'wind_new', name: 'Wind', icon: 'compass', color: '#16A085' },
    { id: 'pressure_new', name: 'Pressure', icon: 'speedometer', color: '#8E44AD' }
  ];

  // Function to change the weather map layer
  const changeWeatherMapLayer = (layerId: string) => {
    setWeatherMapLayer(layerId);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background gradient */}
      <LinearGradient
        colors={gradientColors}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      
      {/* Weather animations */}
      <View style={styles.weatherAnimationContainer}>
        {renderWeatherAnimation()}
      </View>
      
      {/* Header with Favorites button */}
      {headerSection}
      
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          variant="outlined"
          placeholder="Search for a city..."
          placeholderTextColor="rgba(255, 255, 255, 0.7)"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      {/* City dropdown - positioned absolutely */}
      {showDropdown && cities.length > 0 && (
        <View style={styles.dropdownContainer}>
          <FlatList
            data={cities}
            keyExtractor={(item, index) => `${item.name}-${item.country}-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => selectCity(item)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="location-outline" size={16} color="#2980B9" style={{ marginRight: 6 }} />
                  <View>
                    <Text variant="body" style={styles.cityName}>{item.name}</Text>
                    <Text variant="bodySmall" style={styles.countryName}>{item.country}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            style={styles.dropdown}
            nestedScrollEnabled={true}
          />
        </View>
      )}
      
      {/* Content Container */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['white']}
            tintColor="white"
            progressBackgroundColor="rgba(255, 255, 255, 0.2)"
          />
        }
        nestedScrollEnabled={true}
      >
        {/* Weather content */}
        {loading && !weather ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="white" />
            <Text variant="body" style={styles.loadingText}>Loading weather data...</Text>
          </View>
        ) : error && !weather ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={36} color="white" />
            <Text variant="body" style={styles.errorText}>{error}</Text>
          </View>
        ) : weather ? (
          <Animated.View 
            style={[styles.weatherContainer, { opacity: fadeAnim }]}
          >
            {/* City and favorite toggle */}
            <View style={styles.cityHeader}>
              <View style={styles.cityInfo}>
                <Ionicons name="location" size={24} color="white" />
                <Text variant="h1" style={styles.cityTitle}>{weather.city}</Text>
              </View>
              <TouchableOpacity onPress={handleToggleFavorite}>
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={28}
                  color="white"
                />
              </TouchableOpacity>
            </View>
            
            {/* Main temperature display */}
            <View style={styles.temperatureContainer}>
              <Image
                style={styles.weatherIcon}
                source={{
                  uri: `https://openweathermap.org/img/wn/${weather.icon}@4x.png`
                }}
              />
              <View style={styles.tempTextContainer}>
                <Text variant="h1" style={styles.temperature}>{weather.temperature}°</Text>
                <Text variant="h2" style={styles.conditions}>{weather.conditions}</Text>
                <Text variant="body" style={styles.description}>{weather.description}</Text>
              </View>
            </View>
            
            {/* Weather details */}
            <View style={styles.weatherDetailsCard}>
              <View style={styles.weatherDetail}>
                <Ionicons name="water-outline" size={22} color="white" />
                <Text variant="bodySmall" style={styles.detailLabel}>Humidity</Text>
                <Text variant="body" weight="bold" style={styles.detailValue}>{weather.humidity}%</Text>
              </View>
              <View style={styles.weatherDetail}>
                <Ionicons name="speedometer-outline" size={22} color="white" />
                <Text variant="bodySmall" style={styles.detailLabel}>Wind</Text>
                <Text variant="body" weight="bold" style={styles.detailValue}>{weather.windSpeed} m/s</Text>
              </View>
            </View>
            
            {/* Forecast */}
            <View style={styles.forecastCard}>
              <Text variant="h3" style={styles.forecastTitle}>5-Day Forecast</Text>
              <View style={styles.forecastContainer}>
                {weather.forecast.map((day, index) => (
                  <View key={index} style={styles.forecastDay}>
                    <Text variant="bodySmall" style={styles.forecastDate}>{day.date}</Text>
                    <Image
                      style={styles.forecastIcon}
                      source={{
                        uri: `https://openweathermap.org/img/wn/${day.icon}.png`
                      }}
                    />
                    <Text variant="body" weight="bold" style={styles.forecastTemp}>{day.temperature}°</Text>
                  </View>
                ))}
              </View>
            </View>
            
            {/* Weather Map */}
            <View style={styles.weatherMapCard}>
              <Text variant="h3" style={styles.mapTitle}>Weather Map</Text>
              <View style={styles.mapLayersContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.layersScrollView}>
                  {weatherLayers.map(layer => (
                    <TouchableOpacity
                      key={layer.id}
                      style={[
                        styles.layerButton,
                        weatherMapLayer === layer.id && [styles.layerButtonActive, {borderColor: layer.color}]
                      ]}
                      onPress={() => changeWeatherMapLayer(layer.id)}
                    >
                      <Ionicons 
                        name={layer.icon as any} 
                        size={16} 
                        color={weatherMapLayer === layer.id ? "white" : "rgba(255, 255, 255, 0.7)"} 
                        style={styles.layerIcon}
                      />
                      <Text
                        variant="bodySmall"
                        style={[
                          styles.layerButtonText,
                          weatherMapLayer === layer.id && styles.layerButtonTextActive
                        ]}
                      >
                        {layer.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.mapContainer}>
                {weather.lat && weather.lon && (
                  <MapView
                    key={`${weather.lat}-${weather.lon}-${weatherMapLayer}`}
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                    style={styles.map}
                    customMapStyle={Platform.OS === 'android' ? mapCustomStyle : []}
                    initialRegion={{
                      latitude: weather.lat,
                      longitude: weather.lon,
                      latitudeDelta: 5,
                      longitudeDelta: 5,
                    }}
                  >
                    {/* Weather layer */}
                    <UrlTile 
                      urlTemplate={`https://tile.openweathermap.org/map/${weatherMapLayer}/{z}/{x}/{y}.png?appid=${process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY}`}
                      zIndex={1}
                      opacity={0.85}
                      maximumZ={19}
                      flipY={false}
                    />
                    
                    {/* City marker with weather info */}
                    <Marker
                      coordinate={{
                        latitude: weather.lat,
                        longitude: weather.lon,
                      }}
                      title={weather.city}
                      description={`${weather.temperature}° | ${weather.conditions}`}
                    >
                      <View style={styles.customMarker}>
                        <View style={[
                          styles.markerBubble,
                          {borderColor: weatherLayers.find(l => l.id === weatherMapLayer)?.color || '#2980B9'}
                        ]}>
                          <Text variant="bodySmall" style={styles.markerTemp}>{weather.temperature}°</Text>
                          <Text variant="caption" style={styles.markerCondition}>{weather.conditions}</Text>
                        </View>
                        <View style={styles.markerPin}>
                          <Ionicons name="location" size={28} color="#FF5A5F" />
                        </View>
                      </View>
                    </Marker>
                  </MapView>
                )}
              </View>
              <Text variant="caption" style={styles.mapHelpText}>
                Map shows {weatherLayers.find(l => l.id === weatherMapLayer)?.name.toLowerCase() || 'weather'} data from OpenWeatherMap. 
                {weatherMapLayer === 'temp_new' ? ' Blue=cold, Red=hot' : 
                  weatherMapLayer === 'precipitation_new' ? ' Green=light, Red=heavy' : 
                  weatherMapLayer === 'clouds_new' ? ' White=dense clouds' : 
                  weatherMapLayer === 'pressure_new' ? ' Blue=low, Red=high' : 
                  weatherMapLayer === 'wind_new' ? ' Green=slow, Red=fast' : ''}
              </Text>
            </View>
            
            {/* Last updated */}
            <Text variant="caption" style={styles.lastUpdated}>
              Last updated: {new Date(weather.lastUpdated).toLocaleString()}
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="search" size={64} color="rgba(255, 255, 255, 0.5)" />
            <Text variant="h3" style={styles.emptyStateText}>Search for a city to check the weather</Text>
          </View>
        )}
      </ScrollView>
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
  weatherAnimationContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  logoutButton: {
    marginLeft: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  favoriteButtonText: {
    color: 'white',
    marginRight: 8,
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
    zIndex: 100,
  },
  searchInput: {
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  dropdownContainer: {
    position: 'absolute',
    width: '90%',
    top: 160, // Position below the search input
    alignSelf: 'center',
    zIndex: 100,
  },
  dropdown: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 15,
    marginTop: 5,
    maxHeight: 200,
    zIndex: 101,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  cityName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  countryName: {
    fontSize: 14,
    color: '#555',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: 'white',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 30,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
  },
  weatherContainer: {
    padding: 16,
  },
  cityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cityTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
  },
  temperatureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  weatherIcon: {
    width: 120,
    height: 120,
  },
  tempTextContainer: {
    alignItems: 'flex-start',
  },
  temperature: {
    fontSize: 64,
    fontWeight: 'bold',
    color: 'white',
  },
  conditions: {
    fontSize: 24,
    color: 'white',
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'capitalize',
  },
  weatherDetailsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  weatherDetail: {
    alignItems: 'center',
  },
  detailLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 5,
  },
  detailValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 5,
  },
  forecastCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  forecastTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  forecastContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  forecastDay: {
    alignItems: 'center',
  },
  forecastDate: {
    fontSize: 14,
    color: 'white',
    marginBottom: 5,
  },
  forecastIcon: {
    width: 40,
    height: 40,
  },
  forecastTemp: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  weatherMapCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  mapDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 15,
  },
  mapLayersContainer: {
    marginBottom: 10,
  },
  layersScrollView: {
    flexDirection: 'row',
  },
  layerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  layerButtonActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  layerIcon: {
    marginRight: 5,
  },
  layerButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  layerButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  mapContainer: {
    height: 220,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapHelpText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 5,
  },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 6,
    paddingHorizontal: 8,
    position: 'absolute',
    top: -52,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  markerTemp: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  markerCondition: {
    fontSize: 11,
    color: '#555',
    marginTop: 1,
  },
  markerPin: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  lastUpdated: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default HomeScreen; 