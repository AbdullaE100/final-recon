import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, storeData, getData } from './storage';
import { format, subDays, startOfToday, differenceInDays } from 'date-fns';

/**
 * Core function to completely reset all streak-related data
 * Use this with caution - it will delete all streak history
 */
export const resetAllStreakData = async (): Promise<void> => {
  try {
    console.log('resetAllStreakData: Starting to reset ALL streak data...');
    
    // Define keys that need to be cleared
    const streakKeys = [
      STORAGE_KEYS.STREAK_DATA,
      STORAGE_KEYS.CALENDAR_HISTORY,
      STORAGE_KEYS.STREAK_START_DATE,
      'clearmind:manual-streak-value',
      'clearmind:backup-streak-value',
      'clearmind:failsafe-streak-value',
      'clearmind:last-streak-update-time',
      'clearmind:previous-streak-value',
      'clearmind:last-streak-reset-time',
    ];
    
    // Clear data from storage.ts
    for (const key of streakKeys) {
      try {
        // For array/object keys, set to empty values
        if (key === STORAGE_KEYS.CALENDAR_HISTORY) {
          await storeData(key, {});
        } else if (key === STORAGE_KEYS.STREAK_DATA) {
          await storeData(key, {});
        } else {
          await storeData(key, null);
      }
      } catch (err) {
        console.error(`resetAllStreakData: Error clearing key ${key}:`, err);
      }
    }
    
    // Handle special case for user data - we need to update streak to 0 but keep other data
    try {
      const userData = await getData(STORAGE_KEYS.USER_DATA, {});
      if (userData) {
        const updatedUserData = {
          ...userData,
          streak: 0,  // Reset to 0
          startDate: Date.now(),  // Use current timestamp
        };
        await storeData(STORAGE_KEYS.USER_DATA, updatedUserData);
        console.log('resetAllStreakData: Updated user data with streak = 0');
      }
    } catch (userDataError) {
      console.error('resetAllStreakData: Error updating user data:', userDataError);
    }
    
    console.log('resetAllStreakData: Successfully reset all streak data');
  } catch (error) {
    console.error('resetAllStreakData: Failed to reset streak data:', error);
    throw error;
  }
};

/**
 * Utility function to debug streak data by logging all relevant keys and values
 */
export const debugStreakData = async (): Promise<void> => {
  try {
    console.log('Debugging streak data...');
    
    // Get all keys
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Filter for streak-related keys
    const streakKeys = allKeys.filter(key => 
      key.includes('streak') || 
      key.includes('calendar') || 
      key.includes('clearmind:')
    );
    
    // Log each key and its value
    for (const key of streakKeys) {
      const value = await AsyncStorage.getItem(key);
      console.log(`${key}: ${value}`);
    }
    
    console.log('Streak data debug complete');
  } catch (error) {
    console.error('Failed to debug streak data:', error);
  }
};

/**
 * Utility function to set a streak manually for testing purposes
 */
export const setManualStreak = async (days: number): Promise<void> => {
  try {
    console.log(`Setting manual streak to ${days} days...`);
    
    // Calculate start date based on streak length
    const today = startOfToday();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (days - 1));
    
    // Clear existing streak data
    await resetAllStreakData();
    
    // Set the new streak data
    const todayStr = format(today, 'yyyy-MM-dd');
    const history: Record<string, string> = {};
    
    // Mark all days from startDate to today as clean
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      history[dateStr] = 'clean';
    }
    
    // Save the new history
    await storeData(STORAGE_KEYS.CALENDAR_HISTORY, history);
    await storeData(STORAGE_KEYS.STREAK_START_DATE, startDate.toISOString());
    
    // Update user data if it exists
    try {
      const userData = await getData(STORAGE_KEYS.USER_DATA, {});
      if (userData) {
        const updatedUserData = {
          ...userData,
          streak: days,
          startDate: startDate.getTime(),
          lastCheckIn: Date.now()
        };
        await storeData(STORAGE_KEYS.USER_DATA, updatedUserData);
      }
    } catch (userDataError) {
      console.error('Error updating user data:', userDataError);
    }
    
    console.log(`Manual streak set to ${days} days starting from ${startDate.toISOString()}`);
  } catch (error) {
    console.error('Failed to set manual streak:', error);
    throw new Error('Failed to set manual streak');
  }
};

/**
 * Utility function to directly set calendar history with specific clean and relapse days
 */
export const setCalendarHistory = async (
  cleanDays: Date[],
  relapseDays: Date[] = []
): Promise<void> => {
  try {
    console.log(`Setting calendar history with ${cleanDays.length} clean days and ${relapseDays.length} relapse days`);
    
    // Reset all existing streak data
    await resetAllStreakData();
    
    // If there are clean days, establish a new streak from the earliest clean day
    if (cleanDays.length > 0) {
      // Find the earliest date among clean days to set as the streak start date
      const earliestDate = new Date(Math.min(...cleanDays.map(d => d.getTime())));
      const today = startOfToday();
      
      // Create a new history object
      const history: Record<string, string> = {};
      
      // Mark all clean days
      for (const date of cleanDays) {
        const dateStr = format(date, 'yyyy-MM-dd');
        history[dateStr] = 'clean';
      }
      
      // Mark all relapse days
      for (const date of relapseDays) {
        const dateStr = format(date, 'yyyy-MM-dd');
        history[dateStr] = 'relapse';
      }
      
      // Save the new history and start date
      await storeData(STORAGE_KEYS.CALENDAR_HISTORY, history);
      await storeData(STORAGE_KEYS.STREAK_START_DATE, earliestDate.toISOString());
      
      // Calculate the streak length
      const streakLength = differenceInDays(today, earliestDate) + 1;
      
      // Update user data if it exists
      try {
        const userData = await getData(STORAGE_KEYS.USER_DATA, {});
        if (userData) {
          const updatedUserData = {
            ...userData,
            streak: streakLength,
            startDate: earliestDate.getTime(),
            lastCheckIn: Date.now()
          };
          await storeData(STORAGE_KEYS.USER_DATA, updatedUserData);
        }
      } catch (userDataError) {
        console.error('Error updating user data:', userDataError);
      }
    }
    
    console.log(`Calendar history set complete with ${cleanDays.length} clean days and ${relapseDays.length} relapse days.`);
  } catch (error) {
    console.error('Failed to set calendar history:', error);
    throw new Error('Failed to set calendar history');
  }
};

/**
 * Utility function to set a 7-day streak for quick testing
 */
export const setSevenDayStreak = async (): Promise<void> => {
  const today = startOfToday();
  const cleanDays = [];
  
  // Create 7 clean days
  for (let i = 0; i < 7; i++) {
    cleanDays.push(subDays(today, i));
  }
  
  await setCalendarHistory(cleanDays);
  console.log('7-day streak set successfully');
};

/**
 * Utility function to reset streak to exactly 1 day
 * This can be used as an emergency fix when the streak gets stuck or after a relapse
 */
export const resetStreakToOne = async (): Promise<void> => {
  try {
    console.log('resetStreakToOne: Starting reset process');
    
    // Get existing calendar history - we want to preserve it
    let existingHistory: Record<string, string> = {};
    try {
      existingHistory = await getData<Record<string, string>>(STORAGE_KEYS.CALENDAR_HISTORY, {});
      console.log('resetStreakToOne: Successfully retrieved calendar history with', Object.keys(existingHistory).length, 'entries');
    } catch (historyError) {
      console.error('resetStreakToOne: Error getting calendar history, using empty object:', historyError);
      // Continue with empty history if there's an error
    }
    
    // Set today as a clean day
    const today = startOfToday();
    const formattedToday = format(today, 'yyyy-MM-dd');
    
    // Create new history that preserves existing entries
    const history = { ...existingHistory };
    
    try {
      // Check if there was a relapse today
      if (existingHistory[formattedToday] === 'relapse') {
        console.log('resetStreakToOne: Found relapse today, setting tomorrow as start date');
        // If there was a relapse today, set tomorrow as the start date
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const formattedTomorrow = format(tomorrow, 'yyyy-MM-dd');
        
        // Keep today's relapse and set tomorrow as clean
        history[formattedToday] = 'relapse';
        history[formattedTomorrow] = 'clean';
        
        // Set tomorrow as the streak start date
        try {
          await storeData(STORAGE_KEYS.STREAK_START_DATE, tomorrow.toISOString());
          console.log('resetStreakToOne: Set tomorrow as streak start date due to relapse today');
        } catch (saveError) {
          console.error('resetStreakToOne: Error saving streak start date:', saveError);
          // Continue even if save fails
        }
      } else {
        // Mark today as clean
        history[formattedToday] = 'clean';
        
        // Save today as the start date
        try {
          await storeData(STORAGE_KEYS.STREAK_START_DATE, today.toISOString());
          console.log('resetStreakToOne: Set today as streak start date');
        } catch (saveError) {
          console.error('resetStreakToOne: Error saving streak start date:', saveError);
          // Continue even if save fails
        }
      }
      
      // Save the calendar history
      try {
        await storeData(STORAGE_KEYS.CALENDAR_HISTORY, history);
        console.log('resetStreakToOne: Calendar history saved successfully');
      } catch (saveError) {
        console.error('resetStreakToOne: Error saving calendar history:', saveError);
        // Continue even if save fails
      }
    } catch (dateError) {
      console.error('resetStreakToOne: Error processing dates:', dateError);
      // Continue with the function even if there's a date error
    }
    
    // Update streak value in various backup locations - each in a try/catch to continue if one fails
    try {
      await storeData('clearmind:manual-streak-value', '1');
      console.log('resetStreakToOne: Saved manual-streak-value');
    } catch (e) {
      console.error('resetStreakToOne: Error saving manual-streak-value:', e);
    }
    
    try {
      await storeData('clearmind:backup-streak-value', '1');
      console.log('resetStreakToOne: Saved backup-streak-value');
    } catch (e) {
      console.error('resetStreakToOne: Error saving backup-streak-value:', e);
    }
    
    try {
      await storeData('clearmind:failsafe-streak-value', '1');
      console.log('resetStreakToOne: Saved failsafe-streak-value');
    } catch (e) {
      console.error('resetStreakToOne: Error saving failsafe-streak-value:', e);
    }
    
    // Update user data if it exists
    try {
      const userData = await getData(STORAGE_KEYS.USER_DATA, {});
      if (userData && typeof userData === 'object') {
        const updatedUserData = {
          ...userData,
          streak: 1,
          startDate: today.getTime(),
          lastCheckIn: Date.now()
        };
        await storeData(STORAGE_KEYS.USER_DATA, updatedUserData);
        console.log('resetStreakToOne: User data updated successfully');
      } else {
        console.warn('resetStreakToOne: User data not found or invalid format');
      }
    } catch (userDataError) {
      console.error('resetStreakToOne: Error updating user data:', userDataError);
      // Continue even if user data update fails
    }
    
    console.log('resetStreakToOne: Streak successfully reset to 1 day');
    return Promise.resolve();
  } catch (error) {
    console.error('resetStreakToOne: Critical error resetting streak to 1 day:', error);
    // Return resolved promise even on error to prevent app crashes
    return Promise.resolve();
  }
};

/**
 * Call this function to fix the streak for new users.
 * It checks if the user is new and resets their streak to 1 day if needed.
 */
export const fixNewUserStreak = async (): Promise<boolean> => {
  try {
    // Check if this is a new user
    const isOnboardingCompleted = await AsyncStorage.getItem('clearmind:onboarding-completed');
    const isNewUser = isOnboardingCompleted === null || isOnboardingCompleted === 'false';
    
    if (isNewUser) {
      console.log('[resetStreakData] New user detected - resetting streak to 1 day');
      await resetAllStreakData();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[resetStreakData] Error checking new user status:', error);
    return false;
  }
};

/**
 * Call this function to fix the 30-day bug.
 * It checks if the streak is suspiciously close to 30 days and resets it to 1 day if needed.
 */
export const fix30DayBug = async (): Promise<boolean> => {
  try {
    // Check for the 30-day bug in user data
    const userDataStr = await AsyncStorage.getItem('clearmind:user_data');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      if (userData.streak >= 28 && userData.streak <= 32) {
        console.log('[resetStreakData] 30-day bug detected in user data - resetting streak to 1 day');
        await resetAllStreakData();
        return true;
      }
    }
    
    // Check for the 30-day bug in streak context data
    const streakStartDateStr = await AsyncStorage.getItem('clearmind:streak_start_date');
    if (streakStartDateStr) {
      const startDate = new Date(streakStartDateStr);
      const today = startOfToday();
      const differenceInMs = today.getTime() - startDate.getTime();
      const differenceInDays = Math.floor(differenceInMs / (1000 * 60 * 60 * 24));
      
      if (differenceInDays >= 28 && differenceInDays <= 32) {
        console.log('[resetStreakData] 30-day bug detected in streak context - resetting streak to 1 day');
        await resetAllStreakData();
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('[resetStreakData] Error checking for 30-day bug:', error);
    return false;
  }
}; 