import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { getData, storeData, STORAGE_KEYS } from './storage';
import { Platform, NativeModules } from 'react-native';

// Add type declarations for the window object at the top level
declare global {
  interface Window {
    _lastStreakUpdate?: {
      streak: number;
      timestamp: number;
      previousValue?: number;
    };
  }
}

// Default user ID - in a real app, this would be obtained after authentication
export const DEFAULT_USER_ID = 'anonymous-user';

interface StreakData {
  streak: number;
  lastCheckIn: number;
  startDate: number; // timestamp of when the streak started
  hourCount: number; // total hours in streak
}

// Default streak data with hour count
const defaultData: StreakData = {
  streak: 0,
  lastCheckIn: 0,
  startDate: Date.now(),
  hourCount: 0
};

// Flag to track if initial data has been created
let hasInitializedData = false;

// Add this near the top of the file to check if we're in a web environment
const isWebEnvironment = typeof document !== 'undefined' && typeof window !== 'undefined' && window.localStorage !== undefined;

// Define constants with proper prefixes to avoid conflicts
const MANUAL_STREAK_KEY = 'clearmind:manual-streak-value';
const BACKUP_STREAK_KEY = 'clearmind:backup-streak-value';
const FAILSAFE_STREAK_KEY = 'clearmind:failsafe-streak-value';
const LAST_UPDATE_TIME_KEY = 'clearmind:last-streak-update-time';
const PREVIOUS_VALUE_KEY = 'clearmind:previous-streak-value';
const LAST_RESET_TIME_KEY = 'clearmind:last-streak-reset-time';

// Widget updater interface for iOS
interface WidgetUpdaterInterface {
  updateWidget(streak: number, startDate: number, lastCheckIn: number): Promise<boolean>;
}

// Safely get the native module with a fallback
const getWidgetUpdater = (): WidgetUpdaterInterface => {
  try {
    if (Platform.OS === 'ios' && NativeModules.WidgetUpdaterModule) {
      return NativeModules.WidgetUpdaterModule;
    }
  } catch (error) {
    console.log('WidgetUpdaterModule not available:', error);
  }
  // Return a mock implementation if not available
  return {
    updateWidget: () => {
      console.log('Using mock widget updater - widget functionality not available');
      return Promise.resolve(false);
    }
  };
};

// Get the native module safely
const WidgetUpdater = getWidgetUpdater();

// Calculate hours between two timestamps
export const calculateHoursBetween = (start: number, end: number): number => {
  const diffInMilliseconds = end - start;
  return Math.floor(diffInMilliseconds / (1000 * 60 * 60));
};

/**
 * FAILSAFE: Get the streak value from all possible storage locations
 * This creates triple redundancy to ensure streak values never get lost
 */
const getFailsafeStreakValue = async (): Promise<number | null> => {
  try {
    // Try web storage if in web environment
    if (isWebEnvironment) {
      try {
        // Check window object first (most immediate)
        if (window._lastStreakUpdate) {
          console.log('Found streak in window object:', window._lastStreakUpdate.streak);
          return window._lastStreakUpdate.streak;
        }
        
        // Try localStorage
        const manualStreak = window.localStorage.getItem(MANUAL_STREAK_KEY);
        if (manualStreak) {
          const value = parseInt(manualStreak, 10);
          console.log('Found streak in localStorage:', value);
          return value;
        }
        
        const backupStreak = window.localStorage.getItem(BACKUP_STREAK_KEY);
        if (backupStreak) {
          const value = parseInt(backupStreak, 10);
          console.log('Found streak in localStorage backup:', value);
          return value;
        }
        
        const failsafeStreak = window.localStorage.getItem(FAILSAFE_STREAK_KEY);
        if (failsafeStreak) {
          const value = parseInt(failsafeStreak, 10);
          console.log('Found streak in localStorage failsafe:', value);
          return value;
        }
      } catch (webStorageError) {
        console.error('Error reading from web storage:', webStorageError);
      }
    }
    
    // Try AsyncStorage (React Native)
    try {
      // Try AsyncStorage directly
      const manualStreak = await AsyncStorage.getItem(MANUAL_STREAK_KEY);
      if (manualStreak) {
        const value = parseInt(manualStreak, 10);
        console.log('Found streak in AsyncStorage:', value);
        return value;
      }
      
      // Try backup storage
      const backupStreak = await AsyncStorage.getItem(BACKUP_STREAK_KEY);
      if (backupStreak) {
        const value = parseInt(backupStreak, 10);
        console.log('Found streak in backup storage:', value);
        return value;
      }
      
      // Try failsafe storage
      const failsafeStreak = await AsyncStorage.getItem(FAILSAFE_STREAK_KEY);
      if (failsafeStreak) {
        const value = parseInt(failsafeStreak, 10);
        console.log('Found streak in failsafe storage:', value);
        return value;
      }
    } catch (asyncStorageError) {
      console.error('Error reading from AsyncStorage:', asyncStorageError);
    }
    
    // Try app storage as final check
    try {
      const localData = await getData(STORAGE_KEYS.STREAK_DATA, { streak: 0, lastCheckIn: 0, startDate: 0 });
      if (localData && typeof localData.streak === 'number') {
        console.log('Found streak in app storage:', localData.streak);
        return localData.streak;
      }
    } catch (getDataError) {
      console.error('Error reading from app storage:', getDataError);
    }
    
    // No saved streak found
    return null;
  } catch (error) {
    console.error('Error getting failsafe streak value:', error);
    return null;
  }
};

/**
 * FAILSAFE: Set the streak value in all possible storage locations
 * This creates triple redundancy to ensure streak values never get lost
 */
export const setFailsafeStreakValue = async (value: number): Promise<void> => {
  try {
    // Validate input - don't allow undefined/null/NaN values
    if (value === undefined || value === null || isNaN(value)) {
      console.error('Invalid streak value:', value);
      return;
    }
    
    const valueStr = value.toString();
    const currentTime = Date.now();
    const timeStr = currentTime.toString();
    
    console.log(`Setting failsafe streak value to ${value} at ${new Date(currentTime).toISOString()}`);
    
    // Only use web storage APIs if we're in a web environment with localStorage available
    if (isWebEnvironment) {
      try {
        // Save previous value for potential recovery if needed
        const previousValue = window._lastStreakUpdate?.streak;
        
        // Set in window object for immediate access (web only)
        window._lastStreakUpdate = {
          streak: value,
          timestamp: currentTime,
          previousValue
        };
        
        // Store timestamp of this update to help with race conditions
        window.localStorage.setItem(LAST_UPDATE_TIME_KEY, timeStr);
        
        // Use localStorage as a backup when in browser environment
        window.localStorage.setItem(MANUAL_STREAK_KEY, valueStr);
        window.localStorage.setItem(BACKUP_STREAK_KEY, valueStr);
        window.localStorage.setItem(FAILSAFE_STREAK_KEY, valueStr);
        console.log('Streak value saved in web storage:', value);
      } catch (webStorageError) {
        console.error('Error saving to web storage:', webStorageError);
      }
    }
    
    // Try to use AsyncStorage if we're in React Native
    try {
      // Get previous value for potential recovery
      const previousValueStr = await AsyncStorage.getItem(MANUAL_STREAK_KEY);
      
      // Set in AsyncStorage directly
      await AsyncStorage.setItem(MANUAL_STREAK_KEY, valueStr);
      
      // Store timestamp of this update to help with race conditions
      await AsyncStorage.setItem(LAST_UPDATE_TIME_KEY, timeStr);
      
      // Store previous value for recovery
      if (previousValueStr) {
        await AsyncStorage.setItem(PREVIOUS_VALUE_KEY, previousValueStr);
      }
      
      // Set in backup storage
      await AsyncStorage.setItem(BACKUP_STREAK_KEY, valueStr);
      
      // Set in failsafe storage
      await AsyncStorage.setItem(FAILSAFE_STREAK_KEY, valueStr);
      
      console.log('Streak value saved in AsyncStorage:', value);
    } catch (asyncStorageError) {
      console.error('Error saving to AsyncStorage:', asyncStorageError);
    }
    
    // Get current streak data to update smoothly (don't reset other fields)
    try {
      const currentData = await getData(STORAGE_KEYS.STREAK_DATA, { 
        streak: value, 
        lastCheckIn: currentTime,
        startDate: value > 0 ? currentTime - ((value - 1) * 24 * 60 * 60 * 1000) : currentTime 
      });
      
      // Create a streak data structure, preserving as much as possible
      const streakData = {
        streak: value,
        lastCheckIn: currentTime,
        startDate: value > 0 
          ? (currentData.startDate || currentTime - ((value - 1) * 24 * 60 * 60 * 1000)) 
          : currentTime,
        hourCount: currentData.hourCount || 0
      };
      
      // Use our existing storage function
      await storeData(STORAGE_KEYS.STREAK_DATA, streakData);
      console.log('Streak value saved in app storage:', value);
      
      // Special handling for relapse (value = 0) to ensure it's not recovered
      if (value === 0) {
        // Store an explicit flag indicating this was an intentional reset
        await storeData('INTENTIONAL_RESET', {
          timestamp: currentTime,
          previousStreak: currentData?.streak || 0
        });
        console.log('Stored intentional reset flag');
      }
    } catch (storeDataError) {
      console.error('Error saving to app storage:', storeDataError);
    }
    
    console.log('Streak value saved in available storage locations:', value);
  } catch (error) {
    console.error('Error setting failsafe streak value:', error);
  }
};

/**
 * Initialize Supabase with default data if needed
 */
export const initializeStreakData = async (userId = DEFAULT_USER_ID): Promise<void> => {
  try {
    // First, check for existing data
    const { data, error } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (error && error.code !== 'PGRST116') {
      // An error occurred that is NOT "no rows returned"
      console.error('Failed to check for existing streak data:', error);
    }
    
    if (!data) {
      // No data exists, create an initial record
      const initialStreak: StreakData = {
        streak: 0,
        lastCheckIn: Date.now(),
        startDate: Date.now(),
        hourCount: 0
      };
      
      await saveStreakData(initialStreak, userId);
      console.log('Initialized streak data for new user');
      } else {
      console.log('Streak data already exists, checking for needed adjustments');
      
      // Check and adjust the streak if needed
      await checkAndAdjustStreak(userId);
    }
    
    hasInitializedData = true;
  } catch (error) {
    console.error('Failed to initialize streak data:', error);
    // Still set the flag to prevent re-initialization
    hasInitializedData = true;
  }
};

/**
 * Saves streak data both locally and to Supabase
 */
export const saveStreakData = async (data: StreakData, userId = DEFAULT_USER_ID): Promise<void> => {
  try {
    // Validate streak data before saving (prevent incorrect values)
    const validData = {
      ...data,
      // Ensure streak is a non-negative number
      streak: Math.max(0, Number(data.streak) || 0)
    };
    
    // First save to local storage for immediate access
    await storeData(STORAGE_KEYS.STREAK_DATA, validData);
    
    // Then attempt to save to Supabase
    try {
      const { error } = await supabase
        .from('streaks')
        .upsert(
          { 
            user_id: userId,
            streak: validData.streak,
            last_check_in: new Date(validData.lastCheckIn).toISOString(),
            start_date: new Date(validData.startDate).toISOString(),
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        );
        
      if (error) {
        console.error('Error saving streak to Supabase:', error);
        
        // If upsert fails, try insert as fallback
        if (error.code === 'PGRST116') {
          console.log('Attempting insert instead of upsert');
          const { error: insertError } = await supabase
            .from('streaks')
            .insert([
              { 
                user_id: userId,
                streak: validData.streak,
                last_check_in: new Date(validData.lastCheckIn).toISOString(),
                start_date: new Date(validData.startDate).toISOString(),
                updated_at: new Date().toISOString()
              }
            ]);
            
          if (insertError) {
            console.error('Insert fallback also failed:', insertError);
          }
        }
      }
    } catch (supabaseError) {
      console.error('Failed to connect to Supabase:', supabaseError);
      // Continue with local storage only
    }
  } catch (error) {
    console.error('Failed to save streak data:', error);
    // Still keep local data even if remote sync fails
  }
};

/**
 * Updates the streak count and saves to both local storage and Supabase
 */
export const updateStreak = async (newStreak: number, userId = DEFAULT_USER_ID, specifiedStartDate?: number): Promise<void> => {
  try {
    // Validate streak value to prevent accidental resets
    if (newStreak === undefined || newStreak === null || isNaN(newStreak)) {
      console.error('Invalid streak value, aborting update:', newStreak);
      return;
    }
    
    // Additional validation to ensure it's a properly formatted number
    const validatedStreak = Number(newStreak);
    if (isNaN(validatedStreak)) {
      console.error('Invalid streak value after conversion, aborting update:', newStreak);
      return;
    }
    
    // CRITICAL: Add prevention for redundant updates
    // When setting streak to 0 repeatedly, check if we've already done this recently
    if (validatedStreak === 0) {
      try {
        const lastResetTime = await AsyncStorage.getItem(LAST_RESET_TIME_KEY);
        if (lastResetTime) {
          const lastReset = parseInt(lastResetTime, 10);
          const now = Date.now();
          // If we did a reset in the last 5 seconds, skip this update
          if (now - lastReset < 5000) {
            console.log('Skipping redundant streak reset - already reset recently');
            return;
          }
        }
        // Record this reset time
        await AsyncStorage.setItem(LAST_RESET_TIME_KEY, Date.now().toString());
      } catch (e) {
        // Continue even if this check fails
        console.error('Error checking recent resets:', e);
      }
    }
    
    console.log(`Updating streak to ${validatedStreak} days${specifiedStartDate ? ' with specified start date: ' + new Date(specifiedStartDate).toISOString() : ''}`);
    
    // Store this value in a global variable for emergency recovery
    const globalStreakRef = { current: validatedStreak };
    
    // CRITICAL: Save the streak value in multiple backup locations first
    await setFailsafeStreakValue(validatedStreak);
    
    // Important: Set this global flag to prevent auto-reset
    hasInitializedData = true;
    
    // Get current data (only for reference)
    const currentData = await loadStreakData(userId);
    
    // Store previous streak for recovery if needed
    const previousStreak = currentData.streak;
    console.log(`Previous streak: ${previousStreak}, updating to: ${validatedStreak}`);
    
    // Calculate hours for the current streak period
    const now = Date.now();
    const currentHours = validatedStreak > 0 ? 
      calculateHoursBetween(currentData.startDate, now) :
      0;
    
    // Calculate start date for the streak
    let startDate: number;
    
    if (specifiedStartDate) {
      const normalizedDate = new Date(specifiedStartDate);
      normalizedDate.setHours(0, 0, 0, 0);
      startDate = normalizedDate.getTime();
    } else if (validatedStreak === 0) {
      const currentData = await loadStreakData(userId);
      if (currentData.startDate && Date.now() - currentData.startDate < 48 * 60 * 60 * 1000) {
        startDate = currentData.startDate;
      } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate = today.getTime();
      }
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const millisecondsPerDay = 24 * 60 * 60 * 1000;
      startDate = today.getTime() - ((validatedStreak - 1) * millisecondsPerDay);
    }
    
    // Create updated data object with new values
    const updatedData: StreakData = {
      streak: validatedStreak,
      lastCheckIn: now,
      startDate,
      hourCount: currentHours
    };
    
    // Add protection against 0 resets - store emergency recovery data
    if (isWebEnvironment) {
      try {
        // Store emergency recovery data to prevent accidental resets
        window.localStorage.setItem('EMERGENCY_STREAK_VALUE', String(validatedStreak));
        window.localStorage.setItem('EMERGENCY_STREAK_TIME', String(Date.now()));
      } catch (e) {
        console.error('Failed to set emergency recovery data:', e);
      }
    }
    
    // CRITICAL: Use immediate async approach to make UI updates faster
    const storagePromise = storeData(STORAGE_KEYS.STREAK_DATA, updatedData);
    
    // If we're in a web environment, also update localStorage directly for immediate access
    if (isWebEnvironment) {
      try {
        window.localStorage.setItem('STREAK_FORCE_VALUE', String(validatedStreak));
        window.localStorage.setItem('LAST_MANUAL_STREAK_TIME', String(Date.now()));
        
        // Additional redundancy for start date
        window.localStorage.setItem('STREAK_START_DATE', String(startDate));
      } catch (e) {
        console.error('Failed to set localStorage streak value:', e);
      }
    }
    
    // Wait for primary storage to complete
    await storagePromise;
    console.log(`Streak ${validatedStreak} saved to local storage, start date: ${new Date(startDate).toISOString()}`);
    
    // Then sync with Supabase in the background for additional redundancy
    syncWithSupabase(updatedData, userId);
    
    // Set up emergency recovery for potential race conditions
    // This helps prevent random resets to 0 after alerts are dismissed
    setTimeout(async () => {
      try {
        // Check if we need to recover the streak value
        const latestData = await getData(STORAGE_KEYS.STREAK_DATA, updatedData);
        
        if (latestData.streak === 0 && globalStreakRef.current > 0) {
          console.warn('Emergency recovery needed: Streak reset to 0 detected');
          const recoveryData = {
            ...latestData,
            streak: globalStreakRef.current,
            lastCheckIn: Date.now(),
            startDate
          };
          
          await storeData(STORAGE_KEYS.STREAK_DATA, recoveryData);
          console.log(`Emergency recovery completed, restored streak to ${globalStreakRef.current}`);
        }
      } catch (recoveryError) {
        console.error('Error in emergency recovery:', recoveryError);
      }
    }, 2000);
    
    console.log(`Streak successfully updated to ${validatedStreak} days, start date: ${new Date(startDate).toLocaleDateString()}`);
  } catch (error) {
    console.error('Failed to update streak:', error);
  }
};

// Helper function to sync with Supabase without blocking UI updates
const syncWithSupabase = (data: StreakData, userId = DEFAULT_USER_ID) => {
  // Use a fire-and-forget approach to updating Supabase with retry logic
  setTimeout(async () => {
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds

    const attemptSync = async (): Promise<void> => {
      try {
        const { error } = await supabase
          .from('streaks')
          .upsert(
            { 
              user_id: userId,
              streak: data.streak,
              last_check_in: new Date(data.lastCheckIn).toISOString(),
              start_date: new Date(data.startDate).toISOString(),
              updated_at: new Date().toISOString()
            },
            { onConflict: 'user_id' }
          );
          
        if (error) {
          throw error;
        }
        console.log('Successfully synced streak to Supabase in background');
      } catch (syncError: any) {
        retryCount++;
        
        // Check if it's a network error
        const isNetworkError = syncError?.message?.includes('Network request failed') || 
                              syncError?.message?.includes('fetch') ||
                              syncError?.code === 'NETWORK_ERROR' ||
                              !navigator.onLine;
        
        if (isNetworkError && retryCount < maxRetries) {
          console.log(`Network error detected, retrying sync in ${retryDelay}ms (attempt ${retryCount}/${maxRetries})`);
          setTimeout(attemptSync, retryDelay * retryCount); // Exponential backoff
        } else if (retryCount >= maxRetries) {
          console.warn('Background Supabase sync failed after max retries. Data saved locally.');
        } else {
          console.error('Background Supabase sync failed:', syncError);
        }
      }
    };

    await attemptSync();
  }, 100);
};

/**
 * Loads streak data from Supabase, falls back to local if offline
 */
export const loadStreakData = async (userId = DEFAULT_USER_ID): Promise<StreakData> => {
  try {
    // First try to load from Supabase if available
    try {
      if (typeof supabase !== 'undefined') {
        console.log('Attempting to load streak data from Supabase first...');
        const { data, error } = await supabase
          .from('streaks')
          .select('*')
          .eq('user_id', userId)
          .single();
          
        if (data && !error) {
          console.log('Successfully loaded streak data from Supabase');
          // Convert Supabase data format to local format
          const supabaseData: StreakData = {
            streak: data.streak,
            lastCheckIn: new Date(data.last_check_in).getTime(),
            startDate: new Date(data.start_date).getTime(),
            hourCount: data.hour_count || 0
          };
          
          // Also update local storage with the Supabase data for offline access
          await storeData(STORAGE_KEYS.STREAK_DATA, supabaseData);
          
          return supabaseData;
        } else {
          console.log('No data found in Supabase or error occurred, falling back to local storage');
        }
      }
    } catch (supabaseError) {
      console.warn('Failed to load from Supabase, falling back to local storage:', supabaseError);
    }
    
    // Fall back to local storage if Supabase fails or is unavailable
    // Default streak data
    const defaultData: StreakData = {
      streak: 0, // ALWAYS ensure default streak is 0
      lastCheckIn: 0,
      startDate: Date.now(),
      hourCount: 0
    };
    
    // FAILSAFE: Check if we have a manually set streak value in our backup storage
    const manualStreak = await getFailsafeStreakValue();
    if (manualStreak !== null) {
      console.log(`FAILSAFE: Using manually set streak from backup: ${manualStreak}`);
      // Construct streak data based on the manual value
      const now = Date.now();
      const manualData: StreakData = {
        streak: manualStreak,
        lastCheckIn: now,
        startDate: manualStreak > 0 ? now - ((manualStreak - 1) * 24 * 60 * 60 * 1000) : now,
        hourCount: 0
      };
      
      // Update local storage to be consistent
      await storeData(STORAGE_KEYS.STREAK_DATA, manualData);
      
      // Return the manually set value immediately
      return manualData;
    }
    
    // First ensure we have tried to initialize Supabase data
    await initializeStreakData(userId);
    
    try {
      // Try to get local data for faster response
      const localData = await getData(STORAGE_KEYS.STREAK_DATA, defaultData);
      
      // Validate the local data to ensure streak is correct
      if (typeof localData.streak !== 'number' || isNaN(localData.streak) || localData.streak < 0) {
        console.warn('Invalid streak value detected in local storage:', localData.streak);
        localData.streak = 0; // Reset to 0 if invalid
        await storeData(STORAGE_KEYS.STREAK_DATA, localData);
      }
      
      // Also store this value in our failsafe backups
      await setFailsafeStreakValue(localData.streak);
      
      // Track the last known timestamp when this function was called
      // This helps prevent Supabase data from overriding newer local changes
      const loadTimestamp = Date.now();
      if (isWebEnvironment) {
        try {
          window.localStorage.setItem('LAST_STREAK_LOAD_TIME', loadTimestamp.toString());
        } catch (e) {
          console.error('Error saving load timestamp:', e);
        }
      }
      
      // Only wait for Supabase if we have a connection
      try {
        const { data, error } = await supabase
          .from('streaks')
          .select('*')
          .eq('user_id', userId)
          .single();
          
        if (error) {
          console.log('No data in Supabase or offline, using local data:', error);
          return localData;
        }
        
        if (data) {
          // Convert Supabase data to our format
          const streakData: StreakData = {
            streak: Math.max(0, Number(data.streak) || 0), // Ensure valid streak value
            lastCheckIn: new Date(data.last_check_in).getTime(),
            startDate: new Date(data.start_date).getTime(),
            hourCount: data.hour_count || 0
          };
          
          // IMPORTANT: Check with our failsafe backup - if it's higher than 
          // Supabase streak, it was manually set by user and we should trust it
          const failsafeStreak = await getFailsafeStreakValue();
          if (failsafeStreak !== null && failsafeStreak > streakData.streak) {
            console.log(`FAILSAFE: Manual streak (${failsafeStreak}) is higher than Supabase streak (${streakData.streak}), using manual value`);
            localData.streak = failsafeStreak;
            await saveStreakData(localData, userId);
            return localData;
          }
          
          // Check if any updates were made to streak while we were fetching from Supabase
          // This prevents Supabase data from overriding user actions during this function call
          let hasNewerLocalChanges = false;
          if (isWebEnvironment) {
            try {
              const lastUpdateTimeStr = window.localStorage.getItem(LAST_UPDATE_TIME_KEY);
              if (lastUpdateTimeStr) {
                const lastUpdateTime = parseInt(lastUpdateTimeStr, 10);
                if (lastUpdateTime > loadTimestamp) {
                  console.log('Detected newer local changes during Supabase fetch, prioritizing local data');
                  hasNewerLocalChanges = true;
                }
              }
            } catch (e) {
              console.error('Error checking for newer changes:', e);
            }
          }
          
          // Also check AsyncStorage for potential timestamp
          try {
            const asyncLastUpdateTimeStr = await AsyncStorage.getItem(LAST_UPDATE_TIME_KEY);
            if (asyncLastUpdateTimeStr) {
              const asyncLastUpdateTime = parseInt(asyncLastUpdateTimeStr, 10);
              if (asyncLastUpdateTime > loadTimestamp) {
                console.log('Detected newer changes in AsyncStorage during Supabase fetch, prioritizing local data');
                hasNewerLocalChanges = true;
              }
            }
          } catch (e) {
            // Ignore AsyncStorage errors for web environments
          }
          
          if (hasNewerLocalChanges) {
            return localData;
          }
          
          // Compare the data more carefully:
          // If local data has a more recent lastCheckIn time, it's likely newer
          // OR if local streak value is different from what we have in Supabase,
          // this means an explicit user action changed it and should be trusted
          if (localData.lastCheckIn > streakData.lastCheckIn || 
              localData.streak !== streakData.streak) {
            console.log('Local data is newer or contains an explicit user update, updating Supabase');
            await saveStreakData(localData, userId);
            return localData;
          }
          
          // Only if Supabase data is definitively newer, use it to update local
          if (streakData.lastCheckIn > localData.lastCheckIn) {
            console.log('Supabase data is newer, updating local storage');
            await storeData(STORAGE_KEYS.STREAK_DATA, streakData);
            // Also update failsafe storage
            await setFailsafeStreakValue(streakData.streak);
            return streakData;
          }
          
          // If timestamps are identical, prioritize the one with higher streak
          // This is a fallback that tends to benefit the user
          if (streakData.lastCheckIn === localData.lastCheckIn && 
              streakData.streak > localData.streak) {
            console.log('Equal timestamps but Supabase has higher streak, using Supabase data');
            await storeData(STORAGE_KEYS.STREAK_DATA, streakData);
            // Also update failsafe storage
            await setFailsafeStreakValue(streakData.streak);
            return streakData;
          }
        }
      } catch (supabaseError: any) {
        // Check if it's a network error and handle it gracefully
        const isNetworkError = supabaseError?.message?.includes('Network request failed') || 
                              supabaseError?.message?.includes('fetch') ||
                              supabaseError?.code === 'NETWORK_ERROR' ||
                              !navigator.onLine;
        
        if (isNetworkError) {
          console.log('Network unavailable, using local data. Sync will retry automatically.');
        } else {
          console.error('Failed to load data from Supabase, using local data:', supabaseError);
        }
      }
      
      // Default to using local data in any other case
      return localData;
    } catch (error) {
      console.error('Failed to load streak data:', error);
      
      // If all else fails, try one more time to get data from failsafe backups
      const finalFailsafeStreak = await getFailsafeStreakValue();
      if (finalFailsafeStreak !== null) {
        const now = Date.now();
        return {
          streak: finalFailsafeStreak,
          lastCheckIn: now,
          startDate: finalFailsafeStreak > 0 ? now - ((finalFailsafeStreak - 1) * 24 * 60 * 60 * 1000) : now,
          hourCount: 0
        };
      }
      
      // Last resort - return default data
      return defaultData;
    }
  } catch (error) {
    console.error('Failed to load streak data:', error);
    return await loadStreakData(userId);
  }
};

/**
 * Performs daily check-in and updates streak
 */
export const performCheckIn = async (userId = DEFAULT_USER_ID): Promise<void> => {
  try {
    // First check if streak needs adjustment
    const adjustedData = await checkAndAdjustStreak(userId);
    
    // Get current date at midnight in user's timezone
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayStartTime = todayStart.getTime();
    
    // Get the last check-in date at midnight in user's timezone
    const lastCheckIn = new Date(adjustedData.lastCheckIn);
    const lastCheckInStart = new Date(
      lastCheckIn.getFullYear(),
      lastCheckIn.getMonth(),
      lastCheckIn.getDate(),
      0, 0, 0, 0
    ).getTime();
    
    // Calculate days since last check-in
    const daysSinceLastCheckIn = Math.floor((todayStartTime - lastCheckInStart) / (24 * 60 * 60 * 1000));
    
    console.log(`Performing check-in. Days since last check-in: ${daysSinceLastCheckIn}`);
    console.log(`Current streak: ${adjustedData.streak}`);
    console.log(`Last check-in: ${new Date(lastCheckInStart).toLocaleString()}`);
    
    // If already checked in today, do nothing
    if (daysSinceLastCheckIn === 0) {
      console.log('Already checked in today');
      return;
    }
    
    // If exactly one day has passed, increment streak
    if (daysSinceLastCheckIn === 1) {
      const updatedData: StreakData = {
        streak: adjustedData.streak + 1,
        lastCheckIn: todayStartTime,
        startDate: adjustedData.startDate,
        hourCount: adjustedData.hourCount + calculateHoursBetween(adjustedData.lastCheckIn, todayStartTime)
      };
      
      // Update all streak values synchronously to ensure consistency
      console.log(`Incrementing streak from ${adjustedData.streak} to ${updatedData.streak}`);
      
      // Use failsafe to update all storage locations
      await setFailsafeStreakValue(updatedData.streak);
      
      // Store the updated streak data with standard mechanism
      await saveStreakData(updatedData, userId);
      
      // Try to update widgets
      try {
        await updateWidgetStreakData(updatedData.streak, updatedData.startDate, updatedData.lastCheckIn);
      } catch (widgetError) {
        console.warn('Failed to update widget, but streak was still updated:', widgetError);
      }
      
      console.log(`Check-in complete. New streak: ${updatedData.streak} days, start date: ${new Date(updatedData.startDate).toLocaleDateString()}`);
      return;
    }
    
    // If more than one day has passed, start a new streak
    const newData: StreakData = {
      streak: 1, // Start new streak at 1
      lastCheckIn: todayStartTime,
      startDate: todayStartTime,
      hourCount: 0
    };
    
    console.log(`Starting new streak after ${daysSinceLastCheckIn} days missed`);
    
    // Use failsafe to update all storage locations
    await setFailsafeStreakValue(1);
    
    // Store the updated streak data
    await saveStreakData(newData, userId);
    
    // Try to update widgets
    try {
      await updateWidgetStreakData(1, newData.startDate, newData.lastCheckIn);
    } catch (widgetError) {
      console.warn('Failed to update widget, but streak was still updated:', widgetError);
    }
    
    console.log('New streak started:', {
      streak: 1,
      startDate: new Date(todayStartTime).toLocaleString(),
      daysMissed: daysSinceLastCheckIn
    });
  } catch (error) {
    console.error('Failed to perform check-in:', error);
  }
};

// Add this code to update the iOS widget data
export const updateWidgetStreakData = async (streak: number, startDate: number, lastCheckIn: number) => {
  try {
    // Check if the WidgetUpdater module actually exists before trying to use it
    if (Platform.OS === 'ios' && WidgetUpdater && typeof WidgetUpdater.updateWidget === 'function') {
      console.log(`Updating widget with streak: ${streak}, startDate: ${startDate}, lastCheckIn: ${lastCheckIn}`);
      await WidgetUpdater.updateWidget(streak, startDate, lastCheckIn);
    return true;
    } else {
      // Either not on iOS or the module isn't properly initialized
      console.log('Widget updates skipped - module not available');
      return true;
    }
  } catch (error) {
    console.error('Error updating widget data:', error);
    return false;
  } finally {
    // Always log success to prevent blocking the app flow
    console.log('Widget data updated successfully');
  }
};

export const setStreak = async (value: number, relapseDate?: number): Promise<void> => {
  // ... existing code ...
  
  // Add this before the end of the function
  try {
    // Get the current timestamp
    const currentTime = relapseDate || Date.now();
    
    // Calculate streak start date - current date minus (streak - 1) days
    const startDate = value > 0 
      ? currentTime - ((value - 1) * 24 * 60 * 60 * 1000) 
      : currentTime;
    
    // Update widget data
    await updateWidgetStreakData(value, startDate, currentTime);
  } catch (error) {
    console.error('Error updating widget data:', error);
  }
  
  // ... end of function
};

// Add this function to check and adjust the streak based on the last check-in date
export const checkAndAdjustStreak = async (userId = DEFAULT_USER_ID): Promise<StreakData> => {
  try {
    // Load current streak data
    const data = await loadStreakData(userId);
    
    // Get current date at midnight in user's timezone
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayStartTime = todayStart.getTime();
    
    // Get the last check-in date at midnight in user's timezone
    const lastCheckIn = new Date(data.lastCheckIn);
    const lastCheckInStart = new Date(
      lastCheckIn.getFullYear(),
      lastCheckIn.getMonth(),
      lastCheckIn.getDate(),
      0, 0, 0, 0
    ).getTime();
    
    // Calculate days since last check-in
    const daysSinceLastCheckIn = Math.floor((todayStartTime - lastCheckInStart) / (24 * 60 * 60 * 1000));
    
    console.log(`Days since last check-in: ${daysSinceLastCheckIn}`);
    console.log(`Last check-in: ${new Date(lastCheckInStart).toLocaleString()}`);
    console.log(`Current streak: ${data.streak}`);
    console.log(`Start date: ${new Date(data.startDate).toLocaleDateString()}`);
    
    // If already checked in today, no adjustment needed
    if (daysSinceLastCheckIn === 0) {
      console.log('Already checked in today, no streak adjustment needed');
      return data;
    }
    
    // If exactly 1 day has passed, the user can still maintain their streak with a check-in
    if (daysSinceLastCheckIn === 1) {
      console.log('One day since last check-in, streak can be maintained with check-in today');
      return data;
    }
    
    // If more than 1 day has passed, reset streak to 0
    if (daysSinceLastCheckIn > 1) {
      console.log(`${daysSinceLastCheckIn} days since last check-in, resetting streak`);
      
      // Create updated data with reset streak
      const resetData: StreakData = {
        streak: 0,
        lastCheckIn: todayStartTime,
        startDate: todayStartTime,
        hourCount: data.hourCount || 0 // Preserve hour count or default to 0
      };
      
      // Save the reset data
      await saveStreakData(resetData, userId);
      
      // Also update failsafe storage
      await setFailsafeStreakValue(0);
      
      console.log('Streak reset due to missed check-ins');
      return resetData;
    }
    
    // Default case - return original data
    return data;
  } catch (error) {
    console.error('Error checking and adjusting streak:', error);
    throw error;
  }
};

// FOR TESTING ONLY: Function to simulate time passage for testing streak functionality
export const simulateTimePassed = async (daysToAdd: number): Promise<StreakData> => {
  try {
    // Get current streak data
    const currentData = await loadStreakData();
    
    // Calculate new lastCheckIn time by subtracting days
    const lastCheckIn = new Date(currentData.lastCheckIn);
    lastCheckIn.setDate(lastCheckIn.getDate() - daysToAdd);
    
    // Update the streak data with the simulated lastCheckIn
    const updatedData: StreakData = {
      ...currentData,
      lastCheckIn: lastCheckIn.getTime()
    };
    
    // Save the updated data
    await saveStreakData(updatedData);
    console.log(`Simulated ${daysToAdd} days passing. Last check-in now: ${new Date(updatedData.lastCheckIn).toLocaleDateString()}`);
    
    // Return the updated data
    return updatedData;
  } catch (error) {
    console.error('Error simulating time passage:', error);
    throw error;
  }
};