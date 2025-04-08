import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Button, Image } from 'react-native';
import { getWeatherData, clearCityWeatherCache, WeatherData } from '../services/WeatherService';
import { isInternetAvailable } from '../utils/NetworkUtils';
import { City } from '../services/GeoService';

interface WeatherDisplayProps {
  city?: City;
  onRefresh?: () => void;
}

const DEFAULT_CITY: City = {
  name: 'New York',
  country: 'US',
  lat: 40.7128,
  lon: -74.0060
};

// Optimize individual components with memo
const ForecastDay = React.memo(({ day }: { day: { date: string; temperature: number; icon?: string } }) => (
  <View style={styles.forecastDay}>
    <Text style={styles.forecastDate}>{day.date}</Text>
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
));

const DetailItem = React.memo(({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailItem}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
));

const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ city = DEFAULT_CITY, onRefresh }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const fetchWeather = useCallback(async () => {
    if (loading) return; // Prevent duplicate requests
    
    setLoading(true);
    setError(null);
    
    try {
      // Check network status
      const networkAvailable = await isInternetAvailable();
      setIsOnline(networkAvailable);
      
      // Get weather data (from API or cache)
      const data = await getWeatherData(city);
      
      if (data) {
        setWeather(data);
      } else {
        setError('No weather data available');
      }
    } catch (err) {
      setError('Failed to fetch weather data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [city, loading]);

  const handleRefresh = useCallback(() => {
    fetchWeather();
    if (onRefresh) {
      onRefresh();
    }
  }, [fetchWeather, onRefresh]);

  const handleClearCache = useCallback(async () => {
    try {
      await clearCityWeatherCache(city);
      setWeather(null);
      fetchWeather();
    } catch (err) {
      console.error('Failed to clear cache:', err);
    }
  }, [city, fetchWeather]);

  // Only fetch weather when city changes
  useEffect(() => {
    fetchWeather();
  }, [city, fetchWeather]);

  // Loading state - memoized component
  const loadingView = useMemo(() => (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0000ff" />
      <Text style={styles.loadingText}>Loading weather data...</Text>
    </View>
  ), []);

  // Error state - memoized component
  const errorView = useMemo(() => {
    if (!error) return null;
    
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <View style={styles.buttonContainer}>
          <Button title="Try Again" onPress={handleRefresh} />
        </View>
      </View>
    );
  }, [error, handleRefresh]);

  // Weather display - memoized component
  const weatherView = useMemo(() => {
    if (!weather) return null;
    
    return (
      <View style={styles.weatherContainer}>
        <Text style={styles.location}>{weather.city}</Text>
        <Text style={styles.temperature}>{weather.temperature}°</Text>
        <Text style={styles.condition}>{weather.conditions}</Text>
        
        <View style={styles.detailsContainer}>
          <DetailItem label="Humidity" value={`${weather.humidity}%`} />
          <DetailItem label="Wind" value={`${weather.windSpeed} m/s`} />
        </View>
        
        {weather.forecast && (
          <View style={styles.forecastContainer}>
            {weather.forecast.map((day, index) => (
              <ForecastDay key={index} day={day} />
            ))}
          </View>
        )}
        
        <Text style={styles.lastUpdated}>
          Last updated: {new Date(weather.lastUpdated).toLocaleString()}
        </Text>
      </View>
    );
  }, [weather]);
  
  // Buttons - memoized component
  const buttonSection = useMemo(() => (
    <View style={styles.buttonContainer}>
      <Button title="Refresh" onPress={handleRefresh} />
      <Button title="Clear Cache" onPress={handleClearCache} />
    </View>
  ), [handleRefresh, handleClearCache]);

  if (loading) {
    return loadingView;
  }

  if (error) {
    return errorView;
  }

  return (
    <View style={styles.container}>
      <View style={styles.connectionStatus}>
        <Text style={isOnline ? styles.onlineText : styles.offlineText}>
          {isOnline ? '🟢 Online' : '🔴 Offline'}
        </Text>
      </View>
      
      {weather && weatherView}
      
      {buttonSection}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  connectionStatus: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  onlineText: {
    color: 'green',
    fontWeight: 'bold',
  },
  offlineText: {
    color: 'red',
    fontWeight: 'bold',
  },
  weatherContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  location: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  temperature: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  condition: {
    fontSize: 18,
    marginBottom: 20,
  },
  detailsContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  forecastContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  forecastDay: {
    alignItems: 'center',
  },
  forecastDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  forecastIcon: {
    width: 40,
    height: 40,
  },
  forecastTemp: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
  },
  errorText: {
    color: 'red',
    marginBottom: 20,
  },
});

// Memoize the entire component for better performance
export default React.memo(WeatherDisplay); 