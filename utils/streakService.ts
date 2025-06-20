import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { getData, storeData, STORAGE_KEYS } from './storage';
import { Platform, NativeModules } from 'react-native';
import { format, differenceInDays, startOfDay, isAfter, isBefore } from 'date-fns';

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
      const localData = await getData(STORAGE_KEYS.STREAK_DATA, {
        streak: 0,
        lastCheckIn: 0,
        startDate: 0,
        hourCount: 0
      });
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
        startDate: value > 0 ? currentTime - ((value - 1) * 24 * 60 * 60 * 1000) : currentTime,
        hourCount: 0
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
 * Initialize streak data for a user
 */
export const initializeStreakData = async (userId = DEFAULT_USER_ID): Promise<void> => {
  try {
    // Check if data already exists
    const existingData = await getData(STORAGE_KEYS.STREAK_DATA, null);
    
    if (!existingData) {
      console.log('No streak data found, initializing with defaults');
      const now = Date.now();
      const initialData: StreakData = {
        streak: 0,
        lastCheckIn: now,
        startDate: now,
        hourCount: 0
      };
      
      await storeData(STORAGE_KEYS.STREAK_DATA, initialData);
      console.log('Streak data initialized successfully');
      
      // Also initialize calendar history
      await storeData(STORAGE_KEYS.CALENDAR_HISTORY, {});
      
      // Initialize streak start date
      await storeData(STORAGE_KEYS.STREAK_START_DATE, new Date(now).toISOString());
      
      // Update widget if available
      await updateWidgetStreakData(0, now, now);
    } else {
      console.log('Streak data already exists, checking for needed adjustments');
      await checkAndAdjustStreak(userId);
    }
  } catch (error) {
    console.error('Failed to initialize streak data:', error);
  }
};

/**
 * Save streak data for a user
 */
export const saveStreakData = async (data: StreakData, userId = DEFAULT_USER_ID): Promise<void> => {
  try {
    // Validate the data before saving
    const validData: StreakData = {
      streak: typeof data.streak === 'number' ? Math.max(0, data.streak) : 0,
      lastCheckIn: typeof data.lastCheckIn === 'number' ? data.lastCheckIn : Date.now(),
      startDate: typeof data.startDate === 'number' ? data.startDate : Date.now(),
      hourCount: typeof data.hourCount === 'number' ? Math.max(0, data.hourCount) : 0
    };
    
    // Save to local storage
    await storeData(STORAGE_KEYS.STREAK_DATA, validData);
    
    // Update widget
    await updateWidgetStreakData(validData.streak, validData.startDate, validData.lastCheckIn);
    
    // Sync with backend if available
    syncWithSupabase(validData, userId);
    
  } catch (error) {
    console.error('Failed to save streak data:', error);
  }
};

/**
 * Update streak value
 */
export const updateStreak = async (newStreak: number, userId = DEFAULT_USER_ID, specifiedStartDate?: number): Promise<void> => {
  try {
    // Ensure streak is a valid number
    if (typeof newStreak !== 'number' || isNaN(newStreak)) {
      console.error('Invalid streak value:', newStreak);
      return;
    }
    
    // Ensure streak is not negative
    const validStreak = Math.max(0, newStreak);
    
    // Get current data
    const currentData = await getData(STORAGE_KEYS.STREAK_DATA, {
      streak: 0,
      lastCheckIn: Date.now(),
      startDate: Date.now(),
      hourCount: 0
    });
    
    // Calculate new start date if not specified
    const now = Date.now();
    let startDate = specifiedStartDate;
    
    if (!startDate && validStreak > 0) {
      // Calculate start date based on streak (days ago)
      const startOfToday = startOfDay(new Date()).getTime();
      startDate = startOfToday - (validStreak - 1) * 24 * 60 * 60 * 1000;
    } else if (!startDate) {
      // If streak is 0, start date is now
      startDate = now;
    }
    
    // Create updated data
    const updatedData: StreakData = {
      streak: validStreak,
      lastCheckIn: now,
      startDate: startDate,
      hourCount: currentData.hourCount || 0
    };
    
    // Save the updated data
    await saveStreakData(updatedData, userId);
    
    // Also update the streak start date in ISO format for the calendar
    if (validStreak > 0) {
      await storeData(STORAGE_KEYS.STREAK_START_DATE, new Date(startDate).toISOString());
    } else {
      // If streak is 0, clear the start date
      await storeData(STORAGE_KEYS.STREAK_START_DATE, null);
    }
    
    console.log(`Streak updated to ${validStreak} days`);
    
  } catch (error) {
    console.error('Failed to update streak:', error);
  }
};

/**
 * Sync streak data with Supabase backend
 */
const syncWithSupabase = (data: StreakData, userId = DEFAULT_USER_ID) => {
  if (!userId || userId === DEFAULT_USER_ID) {
    return; // Don't sync for anonymous users
  }
  
  const attemptSync = async (): Promise<void> => {
    try {
      // Check if we have a valid user session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        console.log('No valid session for Supabase sync');
        return;
      }
      
      // Upsert streak data
      const { error } = await supabase
        .from('user_streaks')
        .upsert({
          user_id: userId,
          streak: data.streak,
          last_check_in: new Date(data.lastCheckIn).toISOString(),
          start_date: new Date(data.startDate).toISOString(),
          hour_count: data.hourCount,
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Failed to sync streak data with Supabase:', error);
      } else {
        console.log('Successfully synced streak data with Supabase');
      }
    } catch (error) {
      console.error('Error during Supabase sync:', error);
    }
  };
  
  // Fire and forget - don't wait for completion
  attemptSync();
};

/**
 * Load streak data from storage or backend
 */
export const loadStreakData = async (userId = DEFAULT_USER_ID): Promise<StreakData> => {
  try {
    let streakData: StreakData | null = null;
    
    // Try to load from Supabase first if we have a valid user
    if (userId && userId !== DEFAULT_USER_ID) {
      try {
        console.log('Attempting to load streak data from Supabase first...');
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData.session) {
          const { data, error } = await supabase
            .from('user_streaks')
            .select('*')
            .eq('user_id', userId)
            .single();
          
          if (!error && data) {
            console.log('Successfully loaded streak data from Supabase');
            
            // Convert dates to timestamps
            streakData = {
              streak: data.streak || 0,
              lastCheckIn: new Date(data.last_check_in).getTime(),
              startDate: new Date(data.start_date).getTime(),
              hourCount: data.hour_count || 0
            };
            
            // Save to local storage for offline access
            await storeData(STORAGE_KEYS.STREAK_DATA, streakData);
            
            // Update streak start date in ISO format for the calendar
            if (streakData.streak > 0) {
              await storeData(STORAGE_KEYS.STREAK_START_DATE, new Date(streakData.startDate).toISOString());
            }
          }
        }
      } catch (supabaseError) {
        console.error('Error loading streak data from Supabase:', supabaseError);
      }
    }
    
    // If we couldn't load from Supabase, try local storage
    if (!streakData) {
      console.log('Loading streak data from local storage...');
      streakData = await getData(STORAGE_KEYS.STREAK_DATA, defaultData);
    }
    
    // Validate and fix any issues with the data
    const validatedData = validateStreakData(streakData);
    
    // Check if the streak needs to be adjusted based on last check-in
    return checkAndAdjustStreak(userId, validatedData);
    
  } catch (error) {
    console.error('Failed to load streak data:', error);
    return defaultData;
  }
};

/**
 * Validate streak data to ensure it has all required fields with correct types
 */
const validateStreakData = (data: any): StreakData => {
  const now = Date.now();
  
  // Create a valid data object with defaults for missing fields
  const validData: StreakData = {
    streak: typeof data?.streak === 'number' && !isNaN(data.streak) ? Math.max(0, data.streak) : 0,
    lastCheckIn: typeof data?.lastCheckIn === 'number' && !isNaN(data.lastCheckIn) ? data.lastCheckIn : now,
    startDate: typeof data?.startDate === 'number' && !isNaN(data.startDate) ? data.startDate : now,
    hourCount: typeof data?.hourCount === 'number' && !isNaN(data.hourCount) ? Math.max(0, data.hourCount) : 0
  };
  
  return validData;
};

/**
 * Perform a check-in to maintain or increment streak
 */
export const performCheckIn = async (userId = DEFAULT_USER_ID): Promise<void> => {
  try {
    // Get current streak data
    const data = await loadStreakData(userId);
    
    const now = Date.now();
    const today = startOfDay(new Date()).getTime();
    const lastCheckInDay = startOfDay(new Date(data.lastCheckIn)).getTime();
    
    // Calculate days since last check-in
    const daysSinceLastCheckIn = differenceInDays(today, lastCheckInDay);
    
    let newStreak = data.streak;
    let newStartDate = data.startDate;
    let newHourCount = data.hourCount;
    
    // Add hours since last check-in
    const hoursSinceLastCheckIn = calculateHoursBetween(data.lastCheckIn, now);
    newHourCount += hoursSinceLastCheckIn;
    
    console.log(`Performing check-in. Current streak: ${newStreak}, days since last: ${daysSinceLastCheckIn}`);
    console.log(`Current start date: ${new Date(data.startDate).toISOString()}`);
    
    // If this is the first check-in (streak is 0), start a new streak
    if (newStreak === 0) {
      newStreak = 1;
      newStartDate = today;
      console.log('Starting new streak');
    }
    // If checked in today already, maintain streak
    else if (daysSinceLastCheckIn === 0) {
      console.log('Already checked in today, maintaining streak');
      // No changes to streak or start date
    }
    // If checked in yesterday, increment streak
    else if (daysSinceLastCheckIn === 1) {
      newStreak += 1;
      console.log(`Checked in one day after last check-in, incrementing streak to ${newStreak}`);
      // CRITICAL FIX: Do not change the start date when incrementing streak
      // The start date should remain the same as we're continuing the streak
    }
    // If missed 1 day, allow grace period but don't increment
    else if (daysSinceLastCheckIn === 2) {
      console.log('Missed one day, using grace period to maintain streak');
      // No changes to streak or start date with grace period
    }
    // If missed more than 1 day, reset streak
    else {
      console.log(`${daysSinceLastCheckIn} days since last check-in, resetting streak`);
      newStreak = 1;
      newStartDate = today;
    }
    
    // Update streak data
    const updatedData: StreakData = {
      streak: newStreak,
      lastCheckIn: now,
      startDate: newStartDate,
      hourCount: newHourCount
    };
    
    // Debug logging
    console.log(`Updated streak data:
      - Streak: ${newStreak}
      - Start date: ${format(new Date(newStartDate), 'yyyy-MM-dd')}
      - Last check-in: ${format(new Date(now), 'yyyy-MM-dd HH:mm:ss')}
    `);
    
    // Save updated data
    await saveStreakData(updatedData, userId);
    
    // Also update the streak start date in ISO format for the calendar
    await storeData(STORAGE_KEYS.STREAK_START_DATE, new Date(newStartDate).toISOString());
    
    console.log(`Check-in successful. Current streak: ${newStreak} days`);
    
  } catch (error) {
    console.error('Failed to perform check-in:', error);
  }
};

/**
 * Update widget with current streak data
 */
export const updateWidgetStreakData = async (streak: number, startDate: number, lastCheckIn: number) => {
  try {
    // Update widget if on iOS
    if (Platform.OS === 'ios') {
      await WidgetUpdater.updateWidget(streak, startDate, lastCheckIn);
    }
  } catch (error) {
    console.log('Failed to update widget:', error);
  }
};

/**
 * Set streak to a specific value
 */
export const setStreak = async (value: number, startDateTimestamp?: number): Promise<void> => {
  try {
    // Ensure value is a valid number
    if (typeof value !== 'number' || isNaN(value)) {
      console.error('Invalid streak value:', value);
      return;
    }
    
    // Ensure value is not negative
    const validValue = Math.max(0, value);
    
    // Update streak
    await updateStreak(validValue, DEFAULT_USER_ID, startDateTimestamp);
    
  } catch (error) {
    console.error('Failed to set streak:', error);
  }
};

/**
 * Check and adjust streak based on last check-in date
 */
export const checkAndAdjustStreak = async (userId = DEFAULT_USER_ID, loadedData?: StreakData): Promise<StreakData> => {
  try {
    // Get current data if not provided
    const data = loadedData || await getData(STORAGE_KEYS.STREAK_DATA, defaultData);
    
    // Validate the data
    const validData = validateStreakData(data);
    
    const now = Date.now();
    const today = startOfDay(new Date()).getTime();
    const lastCheckInDay = startOfDay(new Date(validData.lastCheckIn)).getTime();
    
    // Calculate days since last check-in
    const daysSinceLastCheckIn = differenceInDays(today, lastCheckInDay);
    
    console.log(`Days since last check-in: ${daysSinceLastCheckIn}`);
    console.log(`Last check-in: ${format(new Date(validData.lastCheckIn), 'dd/MM/yyyy, p')}`);
    console.log(`Current streak: ${validData.streak}`);
    console.log(`Start date: ${format(new Date(validData.startDate), 'dd/MM/yyyy')}`);
    
    let updatedData = { ...validData };
    
    // Check if the start date is in the future
    if (isAfter(new Date(validData.startDate), new Date())) {
      console.log('Start date is in the future, fixing to today');
      updatedData.startDate = today;
      
      // If start date was in the future, reset the streak to 0
      updatedData.streak = 0;
    }
    
    // If last check-in was today, no adjustment needed for streak value
    if (daysSinceLastCheckIn === 0) {
      console.log('Checked in today, no adjustment needed');
      
      // Just update last check-in time to ensure it's current
      updatedData.lastCheckIn = now;
      
      // CRITICAL FIX: If the start date is not properly set based on streak, fix it
      if (updatedData.streak > 0) {
        const expectedStartDate = today - ((updatedData.streak - 1) * 24 * 60 * 60 * 1000);
        
        // If start date is more than 12 hours off from where it should be, correct it
        if (Math.abs(updatedData.startDate - expectedStartDate) > 12 * 60 * 60 * 1000) {
          console.log('Fixing start date to match streak value');
          console.log(`Old start date: ${format(new Date(updatedData.startDate), 'dd/MM/yyyy')}`);
          console.log(`New start date: ${format(new Date(expectedStartDate), 'dd/MM/yyyy')}`);
          updatedData.startDate = expectedStartDate;
        }
      }
    }
    // If last check-in was yesterday, streak is current
    else if (daysSinceLastCheckIn === 1) {
      console.log('One day since last check-in, streak can be maintained with check-in today');
      
      // Update last check-in time
      updatedData.lastCheckIn = now;
      
      // CRITICAL FIX: Ensure the start date remains correct
      // For a continuing streak, the start date should not change
    }
    // If missed 1 day, allow grace period but don't increment
    else if (daysSinceLastCheckIn === 2) {
      console.log('Two days since last check-in, grace period applies');
      
      // Update last check-in time
      updatedData.lastCheckIn = now;
      
      // CRITICAL FIX: Ensure the start date remains correct for the grace period
      // For a streak with grace period, the start date should also not change
    }
    // If missed more than 1 day, reset streak
    else if (daysSinceLastCheckIn > 2) {
      console.log(`${daysSinceLastCheckIn} days since last check-in, resetting streak`);
      
      // Reset streak to 0
      updatedData.streak = 0;
      
      // Update last check-in time
      updatedData.lastCheckIn = now;
      
      // Reset start date to today
      updatedData.startDate = today;
    }
    // If last check-in is in the future (device time changed), fix it
    else if (daysSinceLastCheckIn < 0) {
      console.log('Last check-in is in the future, fixing to today');
      
      // Fix last check-in to current time
      updatedData.lastCheckIn = now;
      
      // CRITICAL FIX: Do not change the start date or streak value
      // This preserves the streak if the device time was temporarily wrong
    }
    
    // Save if changes were made
    if (JSON.stringify(updatedData) !== JSON.stringify(validData)) {
      await saveStreakData(updatedData, userId);
    }
    
    console.log(`Streak status: ${updatedData.streak} days (last check-in: ${format(new Date(updatedData.lastCheckIn), 'dd/MM/yyyy')})`);
    console.log(`Start date: ${format(new Date(updatedData.startDate), 'dd/MM/yyyy')}`);
    console.log('Data verification and recovery complete');
    
    return updatedData;
    
  } catch (error) {
    console.error('Failed to check and adjust streak:', error);
    return defaultData;
  }
};

/**
 * Simulate time passed for testing
 */
export const simulateTimePassed = async (daysToAdd: number): Promise<StreakData> => {
  try {
    // Get current data
    const data = await getData(STORAGE_KEYS.STREAK_DATA, defaultData);
    
    // Simulate time passed by adjusting last check-in
    const simulatedLastCheckIn = data.lastCheckIn - (daysToAdd * 24 * 60 * 60 * 1000);
    
    // Update data with simulated last check-in
    const updatedData: StreakData = {
      ...data,
      lastCheckIn: simulatedLastCheckIn
    };
    
    // Save simulated data
    await storeData(STORAGE_KEYS.STREAK_DATA, updatedData);
    
    // Check and adjust streak based on simulated time
    return checkAndAdjustStreak(DEFAULT_USER_ID, updatedData);
    
  } catch (error) {
    console.error('Failed to simulate time passed:', error);
    return defaultData;
  }
};

/**
 * Schedule daily streak check to ensure streak updates at midnight
 */
export const scheduleDailyStreakCheck = () => {
  // Get current time
  const now = new Date();
  
  // Calculate time until next day (midnight)
  const nextMidnight = new Date();
  nextMidnight.setHours(24, 0, 5, 0); // 12:00:05 AM tomorrow
  
  // Calculate milliseconds until midnight
  const msUntilMidnight = nextMidnight.getTime() - now.getTime();
  
  console.log(`Scheduling daily streak check in ${Math.floor(msUntilMidnight / 1000 / 60)} minutes`);
  
  // Schedule check
  setTimeout(async () => {
    console.log('Performing daily streak check');
    
    try {
      // Load and check streak data
      const data = await loadStreakData();
      
      // Adjust streak if needed
      await checkAndAdjustStreak(DEFAULT_USER_ID, data);
      
      // Schedule next check
      scheduleDailyStreakCheck();
    } catch (error) {
      console.error('Error in daily streak check:', error);
      
      // Retry in 10 minutes if there was an error
      setTimeout(scheduleDailyStreakCheck, 10 * 60 * 1000);
    }
  }, msUntilMidnight);
};