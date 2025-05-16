import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define custom storage interface for Supabase
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

// Supabase project credentials
const supabaseUrl = 'https://gtxigxwklomqdlihxjyd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0eGlneHdrbG9tcWRsaWh4anlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5MzcwNTQsImV4cCI6MjA2MjUxMzA1NH0.kxtmWvTTRYJmYrrwsIzEc-NYE3DDTzblUVUZC2VWWhg';

// Use secure store on native platforms, AsyncStorage on web
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? AsyncStorage : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export { supabase }; 