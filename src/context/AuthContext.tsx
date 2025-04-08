import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { updateAllFavorites } from '../services/FavoritesUpdateService';

// Configuration for AWS Cognito
const COGNITO_CONFIG = {
  ClientId: process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID || '2tbc22gviqulfg9u0no6k61288',
  Region: process.env.EXPO_PUBLIC_COGNITO_REGION || 'eu-west-1'
};

// Alternative method using AWS SDK (similar to the code provided by Claude)
const signInDirectly = async (username: string, password: string) => {
  try {
    console.log('[Auth] Attempting direct sign-in for:', username);
    // We can use this approach too if the standard Cognito method doesn't work
    // This is an alternative implementation
    const response = await fetch('https://cognito-idp.eu-west-1.amazonaws.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
      },
      body: JSON.stringify({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: COGNITO_CONFIG.ClientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
        },
      }),
    });

    console.log('[Auth] Sign-in response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Auth] Sign-in error response:', errorData);
      throw new Error(errorData.message || 'Authentication failed');
    }

    const data = await response.json();
    console.log('[Auth] Sign-in successful, token received');
    
    if (!data.AuthenticationResult || !data.AuthenticationResult.AccessToken) {
      console.error('[Auth] Invalid token format in response');
      throw new Error('Invalid authentication response');
    }
    
    return data.AuthenticationResult.AccessToken;
  } catch (error: any) {
    console.error('[Auth] Direct sign-in error:', error);
    throw error;
  }
};

// JWT token structure interface
interface JWTPayload {
  exp: number;  // Expiration time
  iat: number;  // Issued at
  sub: string;  // Subject (usually user ID)
  [key: string]: any;  // Other potential fields
}

// Secure token storage key
const TOKEN_STORAGE_KEY = 'secure_user_token';

// Simpler approach to store token - no encryption for now to fix crypto issue
const secureStoreToken = async (token: string): Promise<void> => {
  try {
    // Store token directly without encryption to fix crypto issues
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
    console.log('[Auth] Token stored');
  } catch (error) {
    console.error('[Auth] Failed to store token:', error);
    throw error;
  }
};

// Simpler approach to retrieve token
const secureRetrieveToken = async (): Promise<string | null> => {
  try {
    // Retrieve token directly
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    
    if (!token) return null;
    
    console.log('[Auth] Token retrieved');
    return token;
  } catch (error) {
    console.error('[Auth] Failed to retrieve token:', error);
    return null;
  }
};

// Function to check token validity using jwt-decode
const verifyToken = (token: string): boolean => {
  if (!token) {
    console.log('[Auth] No token provided for verification');
    return false;
  }
  
  try {
    // Use jwt-decode to properly parse the token
    const decodedToken = jwtDecode<JWTPayload>(token);
    console.log('[Auth] Token decoded successfully');
    
    // Check if the token has all required fields
    if (!decodedToken || !decodedToken.exp) {
      console.error('[Auth] Token missing required fields');
      return false;
    }
    
    // Check expiration
    const expirationTime = decodedToken.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    
    if (currentTime > expirationTime) {
      console.error('[Auth] Token has expired');
      console.log('[Auth] Expired at:', new Date(expirationTime).toLocaleString());
      console.log('[Auth] Current time:', new Date(currentTime).toLocaleString());
      return false;
    }
    
    // Log token details and expiration time
    const timeToExpiry = Math.floor((expirationTime - currentTime) / 1000 / 60); // minutes
    console.log(`[Auth] Token valid, expires in ${timeToExpiry} minutes`);
    console.log(`[Auth] Expiration time:`, new Date(expirationTime).toLocaleString());
    
    return true;
  } catch (e) {
    console.error('[Auth] Failed to verify token:', e);
    return false;
  }
};

type AuthContextType = {
  isAuthenticated: boolean;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkToken: () => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing token on startup
  useEffect(() => {
    const loadAndValidateToken = async () => {
      try {
        console.log('[Auth] Checking for stored token');
        const storedToken = await secureRetrieveToken();
        
        if (storedToken) {
          console.log('[Auth] Found stored token, validating...');
          
          // Validate the token before using it
          if (verifyToken(storedToken)) {
            console.log('[Auth] Stored token is valid, setting authentication');
            setToken(storedToken);
            setIsAuthenticated(true);
            
            // Update favorites with fresh weather data
            console.log('[Auth] Updating favorites with current weather data');
            updateAllFavorites().catch(error => {
              console.error('[Auth] Error updating favorites on startup:', error);
            });
          } else {
            console.log('[Auth] Stored token is invalid, removing it');
            await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
          }
        } else {
          console.log('[Auth] No stored token found');
        }
      } catch (e) {
        console.error('[Auth] Failed to load or validate token:', e);
        // Clear potentially corrupted token
        await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    };
    
    loadAndValidateToken();
  }, []);

  // Token verification function
  const checkToken = () => {
    if (!token) {
      console.log('[Auth] No token to check');
      return false;
    }
    
    const isValid = verifyToken(token);
    
    // If token is invalid, log the user out automatically
    if (!isValid && isAuthenticated) {
      console.log('[Auth] Token invalid during check, logging user out');
      logout();
    }
    
    return isValid;
  };

  // Set up periodic token validation
  useEffect(() => {
    if (isAuthenticated && token) {
      console.log('[Auth] Setting up token validation interval');
      
      // Check token validity every minute
      const intervalId = setInterval(() => {
        console.log('[Auth] Running periodic token validation');
        checkToken();
      }, 60000); // 1 minute
      
      // Clean up interval on unmount
      return () => {
        console.log('[Auth] Clearing token validation interval');
        clearInterval(intervalId);
      };
    }
  }, [isAuthenticated, token]);

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[Auth] Attempting login for user:', username);
      
      // Use the direct sign-in method
      const newToken = await signInDirectly(username, password);
      
      // Validate the token is correct format
      if (!verifyToken(newToken)) {
        throw new Error('Invalid token received');
      }
      
      // Store token securely
      await secureStoreToken(newToken);
      setToken(newToken);
      setIsAuthenticated(true);
      console.log('[Auth] Login successful');
      
      // Update favorites with fresh weather data
      console.log('[Auth] Updating favorites with current weather data');
      updateAllFavorites().catch(error => {
        console.error('[Auth] Error updating favorites after login:', error);
      });
    } catch (error: any) {
      console.error('[Auth] Login error:', error);
      setError(error.message || 'Authentication failed');
      setIsAuthenticated(false);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('[Auth] Logging out user');
    // Remove token from storage
    AsyncStorage.removeItem(TOKEN_STORAGE_KEY)
      .then(() => {
        setToken(null);
        setIsAuthenticated(false);
        console.log('[Auth] User logged out successfully');
      })
      .catch(err => console.error('[Auth] Logout error:', err));
  };

  return (
    <AuthContext.Provider 
      value={{ 
        isAuthenticated, 
        token, 
        loading, 
        error, 
        login, 
        logout,
        checkToken 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 