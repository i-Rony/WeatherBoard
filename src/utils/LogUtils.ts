/**
 * Utility for optimized logging
 * In production builds, these logs can be turned off completely
 */

// Set this to false in production builds
const ENABLE_DEBUG_LOGS = __DEV__;

/**
 * Log information only in development mode
 */
export const logInfo = (tag: string, message: string, ...args: any[]): void => {
  if (ENABLE_DEBUG_LOGS) {
    console.log(`[${tag}] ${message}`, ...args);
  }
};

/**
 * Log errors in both development and production
 */
export const logError = (tag: string, message: string, error?: any): void => {
  // Always log errors, even in production
  console.error(`[${tag}] ${message}`, error || '');
};

/**
 * Log warning messages
 */
export const logWarning = (tag: string, message: string, ...args: any[]): void => {
  if (ENABLE_DEBUG_LOGS) {
    console.warn(`[${tag}] ${message}`, ...args);
  }
};

/**
 * Conditional console time tracking for performance measurements
 */
export const timeStart = (label: string): void => {
  if (ENABLE_DEBUG_LOGS) {
    console.time(label);
  }
};

/**
 * End time tracking
 */
export const timeEnd = (label: string): void => {
  if (ENABLE_DEBUG_LOGS) {
    console.timeEnd(label);
  }
};

// Helper for React Native's __DEV__ variable typing
declare const __DEV__: boolean; 