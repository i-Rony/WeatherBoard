import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  Animated, 
  Dimensions, 
  TouchableOpacity, 
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { WeatherData } from '../services/WeatherService';
import { StatusBar } from 'expo-status-bar';

// Import our custom animation components
import RainAnimation from './RainAnimation';
import CloudAnimation from './CloudAnimation';
import SunAnimation from './SunAnimation';

interface GlassmorphicWeatherCardProps {
  weatherData: WeatherData;
  onRefresh?: () => void;
}

// Get device width for responsive design
const { width, height } = Dimensions.get('window');

const GlassmorphicWeatherCard: React.FC<GlassmorphicWeatherCardProps> = ({ weatherData, onRefresh }) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Set up animations
  useEffect(() => {
    // Fade in card
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [weatherData]);
  
  // Function to determine background gradient based on weather and time of day
  const getBackgroundGradient = () => {
    const conditions = weatherData.conditions.toLowerCase();
    
    if (conditions.includes('rain') || conditions.includes('storm')) {
      return ['#203A43', '#0F2027'] as const;
    } else if (conditions.includes('snow')) {
      return ['#E0EAFC', '#CFDEF3'] as const;
    } else if (conditions.includes('cloud')) {
      return ['#3F4C6B', '#606C88'] as const;
    } else {
      // Clear or sunny
      return ['#2980B9', '#6DD5FA'] as const;
    }
  };
  
  // Render weather animation based on condition
  const renderWeatherAnimation = () => {
    const conditions = weatherData.conditions.toLowerCase();
    
    if (conditions.includes('rain') || conditions.includes('storm')) {
      return <RainAnimation count={80} speed={5000} />;
    } else if (conditions.includes('clear') || conditions.includes('sun')) {
      return <SunAnimation />;
    } else if (conditions.includes('cloud')) {
      return <CloudAnimation count={5} />;
    }
    
    // Default backup
    return <CloudAnimation count={2} />;
  };
  
  const getDayForecast = () => {
    if (!weatherData.forecast || weatherData.forecast.length === 0) {
      return [];
    }
    
    return weatherData.forecast.slice(0, 5); // Get first 5 days
  };
  
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background gradient */}
      <LinearGradient
        colors={getBackgroundGradient()}
        style={styles.background}
      />
      
      {/* Weather animation background */}
      <View style={styles.weatherAnimationContainer}>
        {renderWeatherAnimation()}
      </View>
      
      {/* Main glassmorphic card */}
      <Animated.View 
        style={[
          styles.glassCard, 
          { opacity: fadeAnim }
        ]}
      >
        {/* Location and search */}
        <View style={styles.headerContainer}>
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={20} color="white" />
            <Text style={styles.location}>{weatherData.city}</Text>
          </View>
          <TouchableOpacity style={styles.searchButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Temperature display */}
        <View style={styles.temperatureContainer}>
          <Text style={styles.temperature}>{weatherData.temperature}°</Text>
          <Text style={styles.weatherCondition}>{weatherData.conditions}</Text>
          <Text style={styles.humidityWind}>
            Humidity: {weatherData.humidity}% • Wind: {weatherData.windSpeed} m/s
          </Text>
        </View>
        
        {/* Forecast section */}
        <View style={styles.forecastContainer}>
          <Text style={styles.forecastTitle}>Forecast</Text>
          <View style={styles.forecastItemsContainer}>
            {getDayForecast().map((day, index) => (
              <View key={index} style={styles.forecastItem}>
                <Text style={styles.forecastDay}>{day.date}</Text>
                {day.icon && (
                  <Image
                    style={styles.forecastIcon}
                    source={{
                      uri: `https://openweathermap.org/img/wn/${day.icon}.png`
                    }}
                  />
                )}
                <Text style={styles.forecastTemp}>{day.temperature}°</Text>
              </View>
            ))}
          </View>
        </View>
        
        {/* Last updated */}
        <Text style={styles.lastUpdated}>
          Last updated: {new Date(weatherData.lastUpdated).toLocaleString()}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  glassCard: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 20,
    padding: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Semi-transparent background
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
      web: {
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
      },
    }),
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 5,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  temperatureContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  temperature: {
    fontSize: 80,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  weatherCondition: {
    fontSize: 24,
    color: 'white',
    marginBottom: 5,
  },
  humidityWind: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  forecastContainer: {
    marginBottom: 20,
  },
  forecastTitle: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  forecastItemsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  forecastItem: {
    alignItems: 'center',
  },
  forecastDay: {
    fontSize: 14,
    color: 'white',
    marginBottom: 5,
  },
  forecastIcon: {
    width: 30,
    height: 30,
  },
  forecastTemp: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  lastUpdated: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});

export default React.memo(GlassmorphicWeatherCard); 