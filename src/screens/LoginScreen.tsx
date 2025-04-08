import React, { useState, useRef } from 'react';
import { 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Text, TextInput } from '../components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Start animation when component mounts
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      await login(username, password);
    } catch (err) {
      // Error is handled in the context
      console.log('Login failed in component:', err);
    }
  };

  const autoFillCredentials = () => {
    setUsername('ronitchatterjee911@gmail.com');
    setPassword('5ZITzIg04^');
  };

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#2980B9', '#6DD5FA']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      
      {/* Animated cloud icons for decoration */}
      <View style={styles.cloudsContainer}>
        <Animated.View style={[styles.cloud, { opacity: fadeAnim, left: '10%', top: '5%' }]}>
          <Ionicons name="cloud" size={60} color="rgba(255, 255, 255, 0.7)" />
        </Animated.View>
        <Animated.View style={[styles.cloud, { opacity: fadeAnim, left: '65%', top: '15%' }]}>
          <Ionicons name="cloud" size={40} color="rgba(255, 255, 255, 0.5)" />
        </Animated.View>
        <Animated.View style={[styles.cloud, { opacity: fadeAnim, left: '30%', top: '25%' }]}>
          <Ionicons name="cloud" size={50} color="rgba(255, 255, 255, 0.6)" />
        </Animated.View>
      </View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formContainer}
      >
        <Animated.View 
          style={[
            styles.loginCard,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Logo and Title */}
          <View style={styles.headerContainer}>
            <Ionicons name="partly-sunny" size={60} color="#2980B9" />
            <Text variant="h1" style={styles.title}>WeatherBoard</Text>
            <Text variant="body" style={styles.subtitle}>Real-time weather at your fingertips</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={24} color="#7f8c8d" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                variant="default"
                placeholder="Email"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#95a5a6"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={24} color="#7f8c8d" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                variant="default"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#95a5a6"
              />
            </View>

            {error && <Text variant="bodySmall" style={styles.errorText}>{error}</Text>}

            <TouchableOpacity 
              style={styles.button} 
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text variant="body" weight="bold" style={styles.buttonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" style={styles.buttonIcon} />
                </>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Test Credentials */}
          <View style={styles.testCredentialsContainer}>
            <Text variant="bodySmall" style={styles.hint}>
              Use test credentials:
            </Text>
            <TouchableOpacity 
              style={styles.credentialsButton}
              onPress={autoFillCredentials}
            >
              <Ionicons name="flash" size={18} color="#2980B9" style={styles.credentialsIcon} />
              <Text variant="bodySmall" style={styles.credentialsText}>
                Auto-fill test account
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* App Version */}
      <Text variant="caption" style={styles.versionText}>
        WeatherBoard v1.0.0
      </Text>
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
  cloudsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  cloud: {
    position: 'absolute',
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loginCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    maxWidth: 400,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    color: '#2c3e50',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  subtitle: {
    color: '#7f8c8d',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 15,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#2c3e50',
    fontSize: 16,
    paddingVertical: 0,
  },
  button: {
    backgroundColor: '#2980B9',
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  errorText: {
    color: '#e74c3c',
    marginBottom: 15,
    textAlign: 'center',
  },
  testCredentialsContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  hint: {
    textAlign: 'center',
    color: '#7f8c8d',
    marginBottom: 10,
  },
  credentialsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(41, 128, 185, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  credentialsIcon: {
    marginRight: 6,
  },
  credentialsText: {
    color: '#2980B9',
  },
  versionText: {
    color: 'rgba(255, 255, 255, 0.7)',
    position: 'absolute',
    bottom: 20,
  }
});

export default LoginScreen; 