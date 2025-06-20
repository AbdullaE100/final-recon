import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './storage';
import { format, subDays, startOfToday } from 'date-fns';

/**
 * Utility function to reset streak data and clear the cache
 * This can be used when the streak calendar is not displaying correctly
 */
export const resetStreakData = async (): Promise<void> => {
  try {
    console.log('Resetting streak data and clearing cache...');
    
    // Get the keys related to streak data
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
      'clearmind:intentional-reset',
      `${STORAGE_KEYS.CALENDAR_HISTORY}:backup`,
      `${STORAGE_KEYS.STREAK_START_DATE}:backup`,
    ];
    
    // Remove all streak-related keys
    await AsyncStorage.multiRemove(streakKeys);
    
    console.log('Streak data reset complete');
  } catch (error) {
    console.error('Failed to reset streak data:', error);
    throw new Error('Failed to reset streak data');
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (days - 1));
    
    // Create calendar history
    const calendarHistory: Record<string, 'clean' | 'relapse'> = {};
    
    // Fill in clean days
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      calendarHistory[dateStr] = 'clean';
    }
    
    // Store the data
    await AsyncStorage.setItem(STORAGE_KEYS.STREAK_START_DATE, startDate.toISOString());
    await AsyncStorage.setItem(STORAGE_KEYS.CALENDAR_HISTORY, JSON.stringify(calendarHistory));
    
    console.log(`Manual streak set to ${days} days starting from ${startDate.toISOString()}`);
    console.log(`Calendar history created with ${Object.keys(calendarHistory).length} entries`);
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
    
    // Create calendar history
    const calendarHistory: Record<string, 'clean' | 'relapse'> = {};
    
    // Add clean days
    for (const date of cleanDays) {
      const dateStr = format(date, 'yyyy-MM-dd');
      calendarHistory[dateStr] = 'clean';
    }
    
    // Add relapse days
    for (const date of relapseDays) {
      const dateStr = format(date, 'yyyy-MM-dd');
      calendarHistory[dateStr] = 'relapse';
    }
    
    // Store the data
    await AsyncStorage.setItem(STORAGE_KEYS.CALENDAR_HISTORY, JSON.stringify(calendarHistory));
    
    // If we have clean days, set the streak start date to the earliest clean day
    if (cleanDays.length > 0) {
      // Find the earliest date
      const earliestDate = new Date(Math.min(...cleanDays.map(d => d.getTime())));
      await AsyncStorage.setItem(STORAGE_KEYS.STREAK_START_DATE, earliestDate.toISOString());
      console.log(`Streak start date set to ${earliestDate.toISOString()}`);
    }
    
    console.log(`Calendar history set with ${Object.keys(calendarHistory).length} total entries`);
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