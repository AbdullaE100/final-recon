import { supabase } from './supabaseClient';
import { storeData, getData, STORAGE_KEYS } from './storage';

interface UserPreferences {
  username?: string;
  [key: string]: any;
}

/**
 * Synchronizes local user data with Supabase 
 * This is an optional feature - the app works fine without this sync
 * But it allows for data recovery if the user changes devices
 */
export const syncUserData = async (): Promise<boolean> => {
  try {
    // Get the device ID
    const deviceId = await getData<string>(STORAGE_KEYS.DEVICE_ID, '');
    
    // If no device ID, we can't sync
    if (!deviceId) {
      console.log('No device ID found, skipping sync');
      return false;
    }
    
    // Get user preferences including username
    const userPreferences = await getData<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES, {});
    
    // If no username, we can't sync
    if (!userPreferences.username) {
      console.log('No username found in preferences, skipping sync');
      return false;
    }
    
    // Get data to sync
    const userData = await getData(STORAGE_KEYS.USER_DATA, {});
    const streakData = await getData(STORAGE_KEYS.STREAK_DATA, {});
    const journalEntries = await getData(STORAGE_KEYS.JOURNAL_ENTRIES, []);
    const achievements = await getData(STORAGE_KEYS.ACHIEVEMENTS, []);
    
    // Create payload for sync
    const syncData = {
      user_data: userData,
      streak_data: streakData,
      journal_entries: journalEntries,
      achievements: achievements,
      preferences: userPreferences,
      last_sync: new Date().toISOString()
    };
    
    // Update user profile in Supabase
    const { data, error } = await supabase
      .from('user_profiles')
      .update(syncData)
      .eq('device_id', deviceId);
    
    if (error) {
      console.error('Error syncing user data:', error);
      return false;
    }
    
    console.log('User data successfully synced with Supabase');
    return true;
  } catch (error) {
    console.error('Error in syncUserData:', error);
    return false;
  }
};

/**
 * Retrieves user data from Supabase based on username
 * Used for restoring data on a new device
 */
export const retrieveUserData = async (username: string): Promise<boolean> => {
  try {
    // Get data from Supabase
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('username', username)
      .order('last_sync', { ascending: false })
      .limit(1);
    
    if (error || !data || data.length === 0) {
      console.error('Error retrieving user data:', error || 'No data found');
      return false;
    }
    
    const userData = data[0];
    
    // Store the data locally
    if (userData.user_data) await storeData(STORAGE_KEYS.USER_DATA, userData.user_data);
    if (userData.streak_data) await storeData(STORAGE_KEYS.STREAK_DATA, userData.streak_data);
    if (userData.journal_entries) await storeData(STORAGE_KEYS.JOURNAL_ENTRIES, userData.journal_entries);
    if (userData.achievements) await storeData(STORAGE_KEYS.ACHIEVEMENTS, userData.achievements);
    if (userData.preferences) await storeData(STORAGE_KEYS.USER_PREFERENCES, userData.preferences);
    
    // Store the device ID for future syncs
    await storeData(STORAGE_KEYS.DEVICE_ID, userData.device_id);
    
    console.log('User data successfully retrieved from Supabase');
    return true;
  } catch (error) {
    console.error('Error in retrieveUserData:', error);
    return false;
  }
};

/**
 * Checks if there's user data available for a given username
 * Used to verify if data can be restored
 */
export const checkUserDataExists = async (username: string): Promise<boolean> => {
  try {
    // If username is empty, return false immediately
    if (!username.trim()) return false;
    
    // Check if user exists in Supabase
    const { data, error, count } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('username', username);
    
    if (error) {
      console.error('Error checking user data:', error);
      return false;
    }
    
    return (count || 0) > 0;
  } catch (error) {
    console.error('Error in checkUserDataExists:', error);
    return false;
  }
}; 