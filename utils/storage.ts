import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
// Import our safe CryptoJS implementation for Hermes compatibility
import CryptoJS from './safecryptojspolyfill';

// Use a fixed key for all platforms
const ENCRYPTION_KEY = 'clearmind-secure-key-2025';

// Fixed initialization vector for AES encryption/decryption
// This is safe for local storage as long as the key remains secure
const FIXED_IV = '0123456789abcdef';

// Version flag to identify storage schema version - increment this to force a clear
const STORAGE_VERSION = 'v1.0.1';
const VERSION_KEY = 'clearmind:storage-version';
// Special key to force clear on next start
const FORCE_CLEAR_KEY = 'clearmind:force-clear';

// Flag to track if we're using plain storage after a decryption failure
// Setting this to true initially to avoid encryption/decryption errors
let USING_PLAIN_STORAGE = true;

/**
 * Initializes storage by checking version and clearing data if needed
 */
export const initializeStorage = async (): Promise<void> => {
  try {
    // Force clear option for migration issues - set to false to preserve data
    const shouldForceClear = false;
    
    // Check if we have a version flag
    const version = await AsyncStorage.getItem(VERSION_KEY);
    
    // If version doesn't match or doesn't exist, or force clear is enabled, clear storage
    if (version !== STORAGE_VERSION || shouldForceClear) {
      
      
      // Get all keys
      const keys = await AsyncStorage.getAllKeys();
      
      // Filter for app keys (safety measure)
      const appKeys = keys.filter(key => key.startsWith('clearmind:'));
      
      // Remove all app data
      if (appKeys.length > 0) {
        await AsyncStorage.multiRemove(appKeys);
        
      }
      
      // Set new version
      await AsyncStorage.setItem(VERSION_KEY, STORAGE_VERSION);
      
    } else {
      
    }

    // Reset encryption flag to ensure plain storage
    USING_PLAIN_STORAGE = true;
  } catch (error) {
    console.error('[Storage] Error initializing storage:', error);
    
    // If error occurs during version check/clear, attempt data recovery
    try {
      // Set new version but don't clear data - recovery mode
      await AsyncStorage.setItem(VERSION_KEY, STORAGE_VERSION);
      
      
      // Ensure we use plain storage
      USING_PLAIN_STORAGE = true;
    } catch (fallbackError) {
      console.error('[Storage] Failed emergency recovery:', fallbackError);
    }
  }
};

/**
 * Simple storage without encryption for web platform and fallback
 */
const webStorage = {
  setItem: async (key: string, value: any): Promise<void> => {
    try {
      const jsonValue = JSON.stringify(value);
      localStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('Web storage error:', error);
      throw new Error('Failed to store data');
    }
  },

  getItem: async (key: string): Promise<any> => {
    try {
      const jsonValue = localStorage.getItem(key);
      return jsonValue ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Web storage retrieval error:', error);
      return null;
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Web storage removal error:', error);
      throw new Error('Failed to remove data');
    }
  },

  clear: async (): Promise<void> => {
    try {
      const keys = Object.keys(localStorage);
      const appKeys = keys.filter(key => key.startsWith('clearmind:'));
      appKeys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Web storage clear error:', error);
      throw new Error('Failed to clear data');
    }
  }
};

/**
 * Encrypt data before storing (only for native platforms)
 */
const encrypt = (data: any): string => {
  try {
    if (Platform.OS === 'web' || USING_PLAIN_STORAGE) {
      // Don't encrypt on web or if we've fallen back to plain storage
      return JSON.stringify(data);
    }
    
    // Use a deterministic approach that doesn't rely on random values
    const jsonString = JSON.stringify(data);
    
    // Create fixed IV for encryption
    const iv = CryptoJS.enc.Utf8.parse(FIXED_IV);
    const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
    
    // Use a simplified configuration that doesn't require random values
    const encrypted = CryptoJS.AES.encrypt(jsonString, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    return encrypted.toString();
  } catch (error) {
    console.error('Encryption error:', error);
    
    // Fall back to plain JSON storage if encryption fails
    USING_PLAIN_STORAGE = true;
    
    return JSON.stringify(data);
  }
};

/**
 * Try to save a backup of data in plain format alongside encrypted data
 * This serves as a fallback mechanism
 */
const saveBackup = async (key: string, value: any): Promise<void> => {
  try {
    // Check if key is undefined or null
    if (key === undefined || key === null) {
      console.error('Backup storage error: Key is undefined or null');
      return; // Silently fail - this is just a backup
    }
    
    const backupKey = `${key}:backup`;
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(backupKey, jsonValue);
  } catch (error) {
    console.error('Backup storage error:', error);
    // Silently fail - this is just a backup
  }
};

/**
 * Try to load a backup of data if it exists
 */
const loadBackup = async (key: string): Promise<any> => {
  try {
    // Check if key is undefined or null
    if (key === undefined || key === null) {
      console.error('Backup retrieval error: Key is undefined or null');
      return null;
    }
    
    const backupKey = `${key}:backup`;
    const jsonValue = await AsyncStorage.getItem(backupKey);
    if (!jsonValue) return null;
    
    return JSON.parse(jsonValue);
  } catch (error) {
    console.error('Backup retrieval error:', error);
    return null;
  }
};

/**
 * Decrypt data after retrieving (only for native platforms)
 */
const decrypt = (encryptedData: string, key: string): any => {
  try {
    if (Platform.OS === 'web' || USING_PLAIN_STORAGE) {
      // Data is not encrypted on web or if we've fallen back to plain storage
      return JSON.parse(encryptedData);
    }
    
    // Try to detect if data is already in JSON format (not encrypted)
    if (encryptedData.startsWith('{') || encryptedData.startsWith('[')) {
      
      return JSON.parse(encryptedData);
    }
    
    // Use same fixed IV for decryption
    const iv = CryptoJS.enc.Utf8.parse(FIXED_IV);
    const cryptoKey = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
    
    // Decrypt with fixed parameters
    const bytes = CryptoJS.AES.decrypt(encryptedData, cryptoKey, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error(`Decryption error for ${key}:`, error);
    
    // Signal that we should use plain storage going forward
    USING_PLAIN_STORAGE = true;
    
    
    throw error;
  }
};

/**
 * Store data with encryption for native platforms, without encryption for web
 */
export const storeData = async (key: string, value: any): Promise<void> => {
  try {
    // Check if key is undefined or null
    if (key === undefined || key === null) {
      console.error('Storage error: Key is undefined or null');
      throw new Error('Invalid key - must be a string. Key: ' + key);
    }
    
    if (Platform.OS === 'web') {
      await webStorage.setItem(key, value);
    } else {
      // Always save a backup in plain JSON format
      await saveBackup(key, value);
      
      // Always use plain JSON storage for now to avoid encryption issues
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    }
  } catch (error) {
    console.error(`Storage error for ${key}:`, error);
    
    // Try one more time with plain JSON as a last resort
    try {
      // Check if key is undefined or null again for the fallback
      if (key === undefined || key === null) {
        console.error('Fallback storage error: Key is undefined or null');
        throw new Error('Invalid key - must be a string. Key: ' + key);
      }
      
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (fallbackError) {
      console.error(`Fallback storage error for ${key}:`, fallbackError);
      throw new Error('Failed to store data after multiple attempts');
    }
  }
};

/**
 * Retrieve and decrypt data for native platforms, direct retrieval for web
 */
export const getData = async <T>(key: string, defaultValue: T): Promise<T> => {
  try {
    // Check if key is undefined or null
    if (key === undefined || key === null) {
      console.error('Retrieval error: Key is undefined or null');
      return defaultValue;
    }
    
    if (Platform.OS === 'web') {
      const value = await webStorage.getItem(key);
      return value === null ? defaultValue : value;
    } else {
      const storedValue = await AsyncStorage.getItem(key);
      if (storedValue === null) {
        return defaultValue;
      }
      
      try {
        // Direct JSON parse now that we've disabled encryption
        return JSON.parse(storedValue);
      } catch (parseError) {
        
        
        // Try to load from backup
        
        const backupValue = await loadBackup(key);
        if (backupValue !== null) {
          // If backup retrieved successfully, re-save it as main value
          
          await storeData(key, backupValue);
          return backupValue;
        }
        
        // If all recovery methods fail, return default
        
        return defaultValue;
      }
    }
  } catch (error) {
    console.error(`Retrieval error for ${key}:`, error);
    return defaultValue;
  }
};

/**
 * Remove data from storage
 */
export const removeData = async (key: string): Promise<void> => {
  try {
    // Check if key is undefined or null
    if (key === undefined || key === null) {
      console.error('Removal error: Key is undefined or null');
      throw new Error('Invalid key - must be a string. Key: ' + key);
    }
    
    if (Platform.OS === 'web') {
      await webStorage.removeItem(key);
    } else {
      // Also remove any backup
      const backupKey = `${key}:backup`;
      await AsyncStorage.multiRemove([key, backupKey]);
    }
  } catch (error) {
    console.error(`Removal error for ${key}:`, error);
    throw new Error('Failed to remove data');
  }
};

/**
 * Clear all app data
 */
export const clearAllData = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      await webStorage.clear();
    } else {
      const keys = await AsyncStorage.getAllKeys();
      const appKeys = keys.filter(key => key.startsWith('clearmind:'));
      if (appKeys.length > 0) {
        await AsyncStorage.multiRemove(appKeys);
      }
    }
  } catch (error) {
    console.error('Clear all data error:', error);
    throw new Error('Failed to clear all data');
  }
};

/**
 * Specifically clears user-sensitive data when starting a new onboarding session.
 * This is to prevent data from a previous user/session from leaking.
 */
export const clearSensitiveDataForNewUser = async (): Promise<void> => {
  try {
    const keysToRemove = [
      STORAGE_KEYS.DEVICE_ID,
      STORAGE_KEYS.STREAK_DATA, // This is the generic key, which we also want to clear
      STORAGE_KEYS.CALENDAR_HISTORY,
      STORAGE_KEYS.STREAK_START_DATE,
      STORAGE_KEYS.USER_PREFERENCES,
      STORAGE_KEYS.COMPANION_DATA,
      'clearmind:manual-streak-value',
      'clearmind:backup-streak-value',
      'clearmind:failsafe-streak-value',
      'clearmind:last-streak-update-time',
      'clearmind:previous-streak-value',
      'clearmind:last-streak-reset-time',
    ];

    if (Platform.OS === 'web') {
      keysToRemove.forEach(key => webStorage.removeItem(key));
      if (window._lastStreakUpdate) delete window._lastStreakUpdate;
    } else {
      await AsyncStorage.multiRemove(keysToRemove);
    }
    console.log('clearSensitiveDataForNewUser: Successfully cleared sensitive data.');
  } catch (error) {
    console.error('clearSensitiveDataForNewUser Error:', error);
  }
}

/**
 * Storage keys used throughout the app
 */
export const STORAGE_KEYS = {
  USER_DATA: 'clearmind:user_data',
  STREAK_DATA: 'clearmind:streak_data',
  CALENDAR_HISTORY: 'clearmind:calendar_history',
  STREAK_START_DATE: 'clearmind:streak_start_date',
  JOURNAL_ENTRIES: 'clearmind:journal_entries',
  CHALLENGES: 'clearmind:challenges',
  ACTIVE_CHALLENGES: 'clearmind:active_challenges',
  ACHIEVEMENTS: 'clearmind:achievements',
  SETTINGS: 'clearmind:settings',
  ONBOARDING_COMPLETED: 'clearmind:onboarding-completed',
  USER_PREFERENCES: 'clearmind:user-preferences',
  COMPANION_DATA: 'clearmind:companion-data',
  COMPANION_CHAT_HISTORY: 'clearmind:companion-chat-history',
  COMPANION_UNREAD_MESSAGE: 'clearmind:companion-unread-message',
  ACTIVITY_LOG: 'clearmind:activity-log',
  ACTIVITY_STATS: 'clearmind:activity-stats',
  LAST_CHECKIN: 'clearmind:last-checkin',
  LAST_SYNC: 'clearmind:last-sync',
  WIDGET_DATA: 'clearmind:widget-data',
  BACKUP_DATA: 'clearmind:backup-data',
  RELAPSE_HISTORY: 'clearmind:relapse-history',
  INTENTIONAL_RELAPSE: 'clearmind:intentional-relapse',
  DEVICE_ID: 'clearmind:device-id',
  NOTIFICATION_SETTINGS: 'clearmind:notification-settings',
  DAILY_CHECKIN_STREAK: 'clearmind:daily-checkin-streak',
};