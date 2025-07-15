import React, { useEffect, useState } from 'react';
import { Stack, useRouter , SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider } from '@/context/ThemeContext';
import { GamificationProvider } from '@/context/GamificationContext';
import { CompanionChatProvider } from '@/context/CompanionChatContext';
import { AuthProvider } from '@/context/AuthContext';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import { useFonts } from 'expo-font';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { initializeStorage, getData, storeData, STORAGE_KEYS } from '@/utils/storage';
import { Alert } from 'react-native';
import { supabase } from '@/utils/supabaseClient';
import { initializeHermesGuard } from '@/utils/hermesguard';
import { StreakProvider } from '@/context/StreakContext';
import { fixNewUserStreak, fix30DayBug } from '@/utils/resetStreakData';

// Initialize Hermes compatibility guard immediately
initializeHermesGuard();

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const router = useRouter();
  const [dataInitialized, setDataInitialized] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [showRecoveryOption, setShowRecoveryOption] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    'Nunito-Regular': Nunito_400Regular,
    'Nunito-SemiBold': Nunito_600SemiBold,
    'Nunito-Bold': Nunito_700Bold,
  });

  // Initialize app storage
  useEffect(() => {
    const setupStorage = async () => {
      try {
        // Step 1: Initialize local storage
        await initializeStorage();
        console.log('Storage initialized successfully');
        
        // Step 2: Check Supabase connection (optional)
        try {
          const { error } = await supabase.from('streaks').select('count', { count: 'exact', head: true });
          if (error) {
            console.warn('Supabase connection error, will use local storage:', error.message);
          } else {
            console.log('Successfully connected to Supabase');
          }
        } catch (supabaseError: any) {
          console.warn('Failed to connect to Supabase, will use local storage:', supabaseError.message);
        }
        
        // EMERGENCY FIX: Reset streak for new users or if 30-day bug is detected
        await fixNewUserStreak();
        await fix30DayBug();
        
        // Step 3: Verify critical data can be loaded
        try {
          await verifyAndRecoverData();
        } catch (verifyError) {
          console.warn('Error during data verification, continuing with default data:', verifyError);
        }
        
        // Step 4: Check if onboarding is completed
        const isOnboardingCompleted = await getData(STORAGE_KEYS.ONBOARDING_COMPLETED, false);
        setOnboardingCompleted(isOnboardingCompleted);
        
        // If onboarding is not completed, check if Supabase is available to 
        // enable data recovery option
        if (!isOnboardingCompleted) {
          try {
            const { count, error } = await supabase
              .from('user_profiles')
              .select('*', { count: 'exact', head: true });
            
            // If there are user profiles in the database and no error, 
            // show the recovery option
            if (!error && count && count > 0) {
              setShowRecoveryOption(true);
            }
          } catch (recoveryError: any) {
            const isNetworkError = recoveryError?.message?.includes('Network request failed') || 
                                 recoveryError?.message?.includes('fetch') ||
                                 !navigator.onLine;
            
            if (!isNetworkError) {
              console.warn('Could not check for recovery data:', recoveryError);
            }
          }
        }
        
        setDataInitialized(true);
      } catch (error) {
        console.error('Failed to initialize storage:', error);
        
        // Even on error, mark as initialized so the app doesn't get stuck
        setDataInitialized(true);
        setOnboardingCompleted(false); // Default to showing onboarding
        
        // Use standard Alert for initialization errors since the GamificationProvider
        // isn't loaded yet when this error might occur
        Alert.alert(
          "Data Recovery",
          "We encountered an issue loading your data. Some information may have been reset to default values.",
          [{ text: "OK" }]
        );
      }
    };

    setupStorage();
  }, []);

  // Verify critical data and attempt recovery if needed
  const verifyAndRecoverData = async () => {
    try {
      // Test load each critical data type with fallback to defaults
      const userData = await getData(STORAGE_KEYS.USER_DATA, { 
        streak: 0,
        lastCheckIn: 0,
        level: 1,
        points: 0,
        badgesEarned: [],
        challengesCompleted: [],
        challengesActive: [],
      });
      
      // Force re-save the data to ensure it's in a format that can be read later
      await storeData(STORAGE_KEYS.USER_DATA, userData);
      
      // Also verify journal entries
      const journalEntries = await getData(STORAGE_KEYS.JOURNAL_ENTRIES, []);
      await storeData(STORAGE_KEYS.JOURNAL_ENTRIES, journalEntries);
      
      console.log('Data verification and recovery complete');
    } catch (error) {
      console.error('Error during data verification:', error);
      // Let the outer try/catch handle this
      throw error;
    }
  };

  // Route to onboarding or main app based on onboarding status
  useEffect(() => {
    if (onboardingCompleted !== null && dataInitialized && (fontsLoaded || fontError)) {
      setTimeout(() => {
        if (!onboardingCompleted) {
          // If recovery option is available, redirect to our recovery screen
          if (showRecoveryOption) {
            router.replace('/recover' as any);
          } else {
            router.replace('/onboarding');
          }
        }
      }, 100);
    }
  }, [onboardingCompleted, dataInitialized, fontsLoaded, fontError, router, showRecoveryOption]);

  // Hide splash screen once fonts are loaded
  useEffect(() => {
    if ((fontsLoaded || fontError) && dataInitialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, dataInitialized]);

  // Return null to keep splash screen visible while fonts load
  if (!fontsLoaded && !fontError && !dataInitialized) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <GamificationProvider>
            <StreakProvider>
              <CompanionChatProvider>
                <StatusBar style="light" />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
                  <Stack.Screen name="recover" options={{ headerShown: false, gestureEnabled: false }} />
                  <Stack.Screen name="companion-chat" options={{ headerShown: false }} />
                  <Stack.Screen name="companions-demo" options={{ headerShown: false }} />
                  <Stack.Screen name="my-pledge" options={{ headerShown: false }} />
                  <Stack.Screen name="edit-pledge" options={{ headerShown: false }} />
                  <Stack.Screen name="subscription" options={{ headerShown: false }} />
                  <Stack.Screen name="free-trial" options={{ headerShown: false }} />
                  <Stack.Screen name="streak-tester" options={{ headerShown: false }} />
                  <Stack.Screen name="+not-found" options={{ headerShown: false }} />
                </Stack>
              </CompanionChatProvider>
            </StreakProvider>
          </GamificationProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}