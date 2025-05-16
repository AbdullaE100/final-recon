import { supabase } from './supabaseClient';
import { getData, storeData, STORAGE_KEYS } from './storage';

// Default user ID - in a real app, this would be obtained after authentication
const DEFAULT_USER_ID = 'anonymous-user';

interface StreakData {
  streak: number;
  lastCheckIn: number;
  startDate: number; // timestamp of when the streak started
}

// Flag to track if initial data has been created
let hasInitializedData = false;

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
 * Loads streak data from Supabase, falls back to local if offline
 */
export const loadStreakData = async (userId = DEFAULT_USER_ID): Promise<StreakData> => {
  // Default streak data
  const defaultData: StreakData = {
    streak: 0, // ALWAYS ensure default streak is 0
    lastCheckIn: 0,
    startDate: Date.now(),
  };
  
  // First ensure we have tried to initialize Supabase data
  await initializeStreakData(userId);
  
  try {
    // Try to get local data first for faster response
    const localData = await getData(STORAGE_KEYS.STREAK_DATA, defaultData);
    
    // Validate the local data to ensure streak is correct
    if (typeof localData.streak !== 'number' || isNaN(localData.streak) || localData.streak < 0) {
      console.warn('Invalid streak value detected in local storage:', localData.streak);
      localData.streak = 0; // Reset to 0 if invalid
      await storeData(STORAGE_KEYS.STREAK_DATA, localData);
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
        
        // Only update local storage if Supabase data is newer
        if (!localData.lastCheckIn || streakData.lastCheckIn >= localData.lastCheckIn) {
          await storeData(STORAGE_KEYS.STREAK_DATA, streakData);
          return streakData;
        }
        
        // If local data is newer, update Supabase
        if (localData.lastCheckIn > streakData.lastCheckIn) {
          await saveStreakData(localData, userId);
        }
      }
      
      return localData;
    } catch (supabaseError) {
      console.error('Supabase connection error, using local data:', supabaseError);
      return localData;
    }
  } catch (error) {
    console.error('Failed to load streak data:', error);
    // Fall back to default data if all else fails
    return defaultData;
  }
};

/**
 * Updates the streak count and saves to both local storage and Supabase
 */
export const updateStreak = async (newStreak: number, userId = DEFAULT_USER_ID): Promise<void> => {
  try {
    // Get current data
    const currentData = await loadStreakData(userId);
    
    // Calculate new start date if streak was reset to 0
    let startDate = currentData.startDate;
    if (newStreak === 0) {
      startDate = Date.now();
    } else if (newStreak === 1 && currentData.streak === 0) {
      // If starting a new streak from 0
      startDate = Date.now();
    }
    
    // Update with new values
    const updatedData: StreakData = {
      streak: newStreak,
      lastCheckIn: Date.now(),
      startDate,
    };
    
    // Save updated data
    await saveStreakData(updatedData, userId);
  } catch (error) {
    console.error('Failed to update streak:', error);
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