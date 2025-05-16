import { supabase } from './supabaseClient';
import { getData, storeData, STORAGE_KEYS } from './storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
}

// Flag to track if initial data has been created
let hasInitializedData = false;

// Add this near the top of the file to check if we're in a web environment
const isWebEnvironment = typeof document !== 'undefined' && typeof window !== 'undefined' && window.localStorage !== undefined;

// Three separate storage keys for redundancy
const MANUAL_STREAK_KEY = 'MANUAL_STREAK_VALUE';
const BACKUP_STREAK_KEY = 'BACKUP_STREAK_VALUE';
const FAILSAFE_STREAK_KEY = 'FAILSAFE_STREAK_VALUE';

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
        window.localStorage.setItem('LAST_STREAK_UPDATE_TIME', timeStr);
        
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
      await AsyncStorage.setItem('LAST_STREAK_UPDATE_TIME', timeStr);
      
      // Store previous value for recovery
      if (previousValueStr) {
        await AsyncStorage.setItem('PREVIOUS_STREAK_VALUE', previousValueStr);
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
  if (hasInitializedData) return;
  
  try {
    // Check if data exists in Supabase
    const { data, error } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (error || !data) {
      console.log('No existing data in Supabase, creating initial record');
      
      // Create initial data
      const initialData: StreakData = {
        streak: 0, // ALWAYS ensure streak starts at 0 for new users
        lastCheckIn: Date.now(),
        startDate: Date.now(),
      };
      
      // Save to Supabase
      const { error: insertError } = await supabase
        .from('streaks')
        .insert([
          { 
            user_id: userId,
            streak: initialData.streak,
            last_check_in: new Date(initialData.lastCheckIn).toISOString(),
            start_date: new Date(initialData.startDate).toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);
      
      if (insertError) {
        console.error('Error creating initial data in Supabase:', insertError);
      } else {
        console.log('Successfully created initial streak data in Supabase');
      }
      
      // Save to local storage regardless of Supabase result
      await storeData(STORAGE_KEYS.STREAK_DATA, initialData);
    }
    
    hasInitializedData = true;
  } catch (error) {
    console.error('Failed to initialize streak data:', error);
    // We'll still use local storage even if this fails
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
    
    console.log(`Updating streak to ${newStreak} days${specifiedStartDate ? ' with specified start date: ' + new Date(specifiedStartDate).toISOString() : ''}`);
    
    // Store this value in a global variable for emergency recovery
    const globalStreakRef = { current: newStreak };
    
    // CRITICAL: Save the streak value in multiple backup locations first
    await setFailsafeStreakValue(newStreak);
    
    // Important: Set this global flag to prevent auto-reset
    hasInitializedData = true;
    
    // Get current data (only for reference)
    const currentData = await loadStreakData(userId);
    
    // Store previous streak for recovery if needed
    const previousStreak = currentData.streak;
    console.log(`Previous streak: ${previousStreak}, updating to: ${newStreak}`);
    
    // Calculate start date for the streak - this is critical for correct streak display
    let startDate: number;
    
    if (specifiedStartDate) {
      // If a specific start date was provided (e.g., from calendar selection), use it
      // Make sure it's normalized to midnight for consistent date calculations
      const normalizedDate = new Date(specifiedStartDate);
      normalizedDate.setHours(0, 0, 0, 0);
      startDate = normalizedDate.getTime();
      console.log(`Using specified start date: ${new Date(startDate).toISOString()}`);
    } else if (newStreak === 0) {
      // If streak is being reset to 0, use current date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate = today.getTime();
    } else {
      // If no start date provided but streak > 0, calculate what it should be
      // Important: Calculate start date as current day - (streak - 1) days
      // This ensures day counting is consistent
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const millisecondsPerDay = 24 * 60 * 60 * 1000;
      startDate = today.getTime() - ((newStreak - 1) * millisecondsPerDay);
    }
    
    // Verify our calculations by checking the derived streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDateObj = new Date(startDate);
    startDateObj.setHours(0, 0, 0, 0);
    
    // Use a more accurate method for calculating days between dates
    const diffTime = Math.abs(today.getTime() - startDateObj.getTime());
    const derivedStreak = Math.round(diffTime / (24 * 60 * 60 * 1000)) + (startDateObj <= today ? 1 : 0);
    
    // Log validation check
    console.log(`Start date: ${startDateObj.toLocaleDateString()}`);
    console.log(`Today: ${today.toLocaleDateString()}`);
    console.log(`Derived streak: ${derivedStreak}, requested streak: ${newStreak}`);
    
    // If there's a significant mismatch, adjust start date to match requested streak
    // Allow small rounding differences due to DST and timezone issues
    if (Math.abs(derivedStreak - newStreak) > 1) {
      console.log('Adjusting start date to match requested streak exactly');
      // Re-calculate with the exact desired streak
      startDate = today.getTime() - ((newStreak - 1) * 24 * 60 * 60 * 1000);
      console.log(`Adjusted start date: ${new Date(startDate).toLocaleDateString()}`);
    }
    
    // Create updated data object with new values
    const updatedData: StreakData = {
      streak: newStreak,
      lastCheckIn: Date.now(), // Update timestamp to ensure it's newer than any server data
      startDate,
    };
    
    // Add protection against 0 resets - store emergency recovery data
    if (isWebEnvironment) {
      try {
        // Store emergency recovery data to prevent accidental resets
        window.localStorage.setItem('EMERGENCY_STREAK_VALUE', String(newStreak));
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
        window.localStorage.setItem('STREAK_FORCE_VALUE', String(newStreak));
        window.localStorage.setItem('LAST_MANUAL_STREAK_TIME', String(Date.now()));
        
        // Additional redundancy for start date
        window.localStorage.setItem('STREAK_START_DATE', String(startDate));
      } catch (e) {
        console.error('Failed to set localStorage streak value:', e);
      }
    }
    
    // Wait for primary storage to complete
    await storagePromise;
    console.log(`Streak ${newStreak} saved to local storage, start date: ${new Date(startDate).toISOString()}`);
    
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
    
    console.log(`Streak successfully updated to ${newStreak} days, start date: ${new Date(startDate).toLocaleDateString()}`);
  } catch (error) {
    console.error('Failed to update streak:', error);
  }
};

// Helper function to sync with Supabase without blocking UI updates
const syncWithSupabase = (data: StreakData, userId = DEFAULT_USER_ID) => {
  // Use a fire-and-forget approach to updating Supabase
  setTimeout(async () => {
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
        console.error('Background Supabase sync failed:', error);
      } else {
        console.log('Successfully synced streak to Supabase in background');
      }
    } catch (syncError) {
      console.error('Background Supabase sync failed:', syncError);
    }
  }, 100);
};

/**
 * Loads streak data from Supabase, falls back to local if offline
 */
export const loadStreakData = async (userId = DEFAULT_USER_ID): Promise<StreakData> => {
  // Default streak data
  const defaultData: StreakData = {
    streak: 0, // ALWAYS ensure default streak is 0
    lastCheckIn: 0,
    startDate: Date.now(),
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
            const lastUpdateTimeStr = window.localStorage.getItem('LAST_STREAK_UPDATE_TIME');
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
          const asyncLastUpdateTimeStr = await AsyncStorage.getItem('LAST_STREAK_UPDATE_TIME');
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
    } catch (supabaseError) {
      console.error('Failed to load data from Supabase, using local data:', supabaseError);
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
      };
    }
    
    // Last resort - return default data
    return defaultData;
  }
};

/**
 * Performs daily check-in and updates streak
 */
export const performCheckIn = async (userId = DEFAULT_USER_ID): Promise<void> => {
  try {
    const data = await loadStreakData(userId);
    
    // Check if already checked in today
    const now = new Date();
    const lastCheckIn = new Date(data.lastCheckIn);
    
    // If same calendar day, do nothing
    if (
      now.getFullYear() === lastCheckIn.getFullYear() &&
      now.getMonth() === lastCheckIn.getMonth() &&
      now.getDate() === lastCheckIn.getDate()
    ) {
      console.log('Already checked in today');
      return;
    }
    
    // Update streak and check-in time
    const updatedData: StreakData = {
      ...data,
      streak: data.streak + 1,
      lastCheckIn: now.getTime(),
    };
    
    await saveStreakData(updatedData, userId);
  } catch (error) {
    console.error('Failed to perform check-in:', error);
  }
}; 