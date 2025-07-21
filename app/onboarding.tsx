import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, Text, TouchableOpacity, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import WelcomeScreen from '@/components/onboarding/WelcomeScreen';
import QuizScreen from '@/components/onboarding/QuizScreen';
import TimeImpactScreen from '@/components/onboarding/TimeImpactScreen';
import CommitmentScreen from '@/components/onboarding/CommitmentScreen';
import CompanionSelectionScreen, { CompanionChoice } from '@/components/onboarding/CompanionSelectionScreen';
import UsernameSetupScreen from '@/components/onboarding/UsernameSetupScreen';
import StreakReveal from '@/components/companions/StreakReveal';
import { storeData, STORAGE_KEYS, getData, clearAllData } from '@/utils/storage';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

import { format } from 'date-fns';

// Define the user preferences interface
interface UserPreferences {
  username?: string;
  signature?: string;
  pledgeDate?: number;
  quizAnswers?: Record<string, any>;
  companion?: CompanionChoice;
  [key: string]: any; // Allow for other properties
}

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  
  // Onboarding state
  const [step, setStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [selectedCompanion, setSelectedCompanion] = useState<CompanionChoice | null>(null);
  const [username, setUsername] = useState<string>('');


  // Steps in the onboarding flow
  const steps = [
    'username',
    'welcome',
    'quiz',
    'timeImpact',
    'commitment',
    'companionSelection',

  ];

  // Handle next step in the flow
  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      completeOnboardingAndNavigate();
    }
  };

  // Handle saving username
  const handleUsernameComplete = (name: string) => {
    setUsername(name);
    handleNext();
  };

  // Handle saving quiz answers
  const handleQuizComplete = (answers: Record<string, string | string[]>) => {
    // Ensure answers are strings, not string arrays, for this component's state
    const singleAnswers: Record<string, string> = {};
    for (const key in answers) {
      if (typeof answers[key] === 'string') {
        singleAnswers[key] = answers[key] as string;
      }
    }
    setQuizAnswers(singleAnswers);
    handleNext();
  };

  // Handle companion selection
  const handleCompanionSelect = (companion: CompanionChoice) => {
    setSelectedCompanion(companion);
    // We'll complete the onboarding process directly here after setting the companion
    // This ensures the companion is set before we try to complete onboarding
    setTimeout(() => {
      completeOnboardingAndNavigate();
    }, 300); // Small delay to ensure state update has completed
  };

  // This function is called when the user confirms their companion choice
  const handleCompanionSelectionComplete = async () => {
    // Check if companion is selected before proceeding
    if (!selectedCompanion) {
      console.warn("Please select a companion before proceeding.");
      Alert.alert(
        "Companion Required",
        "Please select a companion to continue.",
        [{ text: "OK", onPress: () => {} }]
      );
      return;
    }
    
    await completeOnboardingAndNavigate();
  };



  // Complete onboarding and navigate to subscription screen
  const completeOnboardingAndNavigate = async () => {
    if (!selectedCompanion) {
      console.warn("Companion not selected before attempting to complete onboarding.");
    }
    
    // EMERGENCY FIX: Aggressively reset all streak data for new users
    console.log('EMERGENCY FIX: Completely resetting all streak data for new user');
    
    // Define all streak-related keys to clear
    const allStreakKeys = [
      'clearmind:streak_data',
      `clearmind:streak_data:DEFAULT_USER_ID`,
      'clearmind:calendar_history',
      'clearmind:streak_start_date',
      'clearmind:manual-streak-value',
      'clearmind:backup-streak-value',
      'clearmind:failsafe-streak-value',
      'clearmind:last-streak-update-time',
      'clearmind:previous-streak-value',
      'clearmind:last-streak-reset-time',
    ];
    
    try {
      // Clear on web platform
      if (Platform.OS === 'web') {
        allStreakKeys.forEach(key => window.localStorage.removeItem(key));
        
        // Reset window variable if it exists
        if (typeof window !== 'undefined') {
          (window as any)._lastStreakUpdate = {
            streak: 1,
            timestamp: Date.now(),
          };
        }
      }
      
      // Force set clean streak data for day 1
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const newStreakData = {
        streak: 0, // Set initial streak to 0 for new users
        lastCheckIn: Date.now(),
        startDate: today.getTime(),
        hourCount: 0
      };
      
      await storeData(STORAGE_KEYS.STREAK_DATA, newStreakData);
      await storeData(`clearmind:streak_data:DEFAULT_USER_ID`, newStreakData);
      
      // Force set day 1 in calendar history
      const calendarHistory = {
        [format(today, 'yyyy-MM-dd')]: 'clean'
      };
      await storeData(STORAGE_KEYS.CALENDAR_HISTORY, calendarHistory);
      await storeData(STORAGE_KEYS.STREAK_START_DATE, today.toISOString());
      
      // Set all failsafe values to 0 for new users
      await storeData('clearmind:manual-streak-value', '0');
      await storeData('clearmind:backup-streak-value', '0');
      await storeData('clearmind:failsafe-streak-value', '0');
      
      console.log('EMERGENCY FIX: Successfully reset all streak data to 0 days for new user');
    } catch (error) {
      console.error('EMERGENCY FIX: Error resetting streak data:', error);
    }
    
    // Save user preferences and onboarding status
    await storeData(STORAGE_KEYS.ONBOARDING_COMPLETED, true);
    
    // Get existing preferences (including signature if present)
    const existingPreferences = await getData<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES, {});
    console.log('Retrieved existing preferences:', Object.keys(existingPreferences));
    
    // Ensure we don't overwrite signature data
    const updatedPreferences: UserPreferences = {
      ...existingPreferences,
      username,
      quizAnswers,
      companion: selectedCompanion || undefined,
      // Make sure we don't overwrite signature or pledgeDate if they exist
      signature: existingPreferences.signature || undefined,
      pledgeDate: existingPreferences.pledgeDate || undefined,
    };
    
    console.log('Saving updated preferences with keys:', Object.keys(updatedPreferences));
    await storeData(STORAGE_KEYS.USER_PREFERENCES, updatedPreferences);
    
    // Always generate a new device ID for new onboarding
    const deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await storeData(STORAGE_KEYS.DEVICE_ID, deviceId);
    
    // Navigate directly to main app, skipping the free trial screen
    router.replace('/(tabs)' as any);
  };

  // Get risk level based on weekly hours
  const getRiskLevel = () => {
    const weeklyHours = getWeeklyHours(); // Call getWeeklyHours internally
    
    if (weeklyHours >= 1.5) {
      return 'High Risk';
    } else if (weeklyHours >= 1) {
      return 'Medium Risk';
    } else {
      return 'Low Risk';
    }
  };
  
  // Calculate weekly hours based on quiz answers
  const getWeeklyHours = () => {
    // Use the frequency and duration questions to calculate weekly hours
    if (!quizAnswers.frequency || !quizAnswers.duration) return 7; // Default fallback
    
    // Map frequency to times per week
    const frequencyMap = {
      daily_multiple: 14, // ~2 times per day
      daily: 7,           // 1 time per day
      weekly: 3,          // ~3 times per week
      occasionally: 1     // ~1 time per week
    };
    
    // Map duration to hours per session
    const durationMap = {
      short: 0.5,       // 30 min average
      medium: 0.75,     // 45 min average
      long: 1.5,        // 1.5 hours average
      very_long: 2.5    // 2.5 hours average
    };
    
    // Calculate weekly hours: frequency * duration
    const timesPerWeek = frequencyMap[quizAnswers.frequency as keyof typeof frequencyMap] || 3;
    const hoursPerSession = durationMap[quizAnswers.duration as keyof typeof durationMap] || 0.75;
    
    return Math.round(timesPerWeek * hoursPerSession * 10) / 10; // Round to 1 decimal place
  };

  // Render the current step of the onboarding flow
  const renderStep = () => {
    switch (steps[step]) {
      case 'username':
        return <UsernameSetupScreen onComplete={handleUsernameComplete} />;
      case 'welcome':
        return <WelcomeScreen onContinue={handleNext} />;
      case 'quiz':
        return <QuizScreen onComplete={handleQuizComplete} />;
      case 'timeImpact':
        return <TimeImpactScreen 
          riskLevel={getRiskLevel() as 'Low Risk' | 'Medium Risk' | 'High Risk' | 'Very High Risk'}
          weeklyHours={getWeeklyHours()}
          onContinue={handleNext}
        />;
      case 'commitment':
        return <CommitmentScreen onSign={handleNext} />;
      case 'companionSelection':
        return <CompanionSelectionScreen onSelect={handleCompanionSelect} onComplete={handleCompanionSelectionComplete} />;

      default:
        return null;
    }
  };

  // The logic for clearing data has been moved to _layout.tsx to prevent race conditions.
  // This ensures that data is cleared *before* any contexts attempt to load it.
  // useEffect(() => {
  //   const initializeOnboarding = async () => {
  //     // Set a flag to indicate that onboarding is in progress
  //     await storeData(STORAGE_KEYS.ONBOARDING_IN_PROGRESS, true);
  //
  //     // Clear all previous data to ensure a fresh start
  //     await clearAllData();
  //
  //     // Remove all failsafe/manual/backup streak keys
  //     const streakKeys = [
  //       'clearmind:manual-streak-value',
  //       'clearmind:backup-streak-value',
  //       'clearmind:failsafe-streak-value',
  //       'clearmind:last-streak-update-time',
  //       'clearmind:previous-streak-value',
  //       'clearmind:last-streak-reset-time',
  //     ];
  //
  //     if (Platform.OS === 'web') {
  //       streakKeys.forEach(key => window.localStorage.removeItem(key));
  //       if (window._lastStreakUpdate) delete window._lastStreakUpdate;
  //     } else {
  //       await AsyncStorage.multiRemove(streakKeys);
  //     }
  //   };
  //
  //   initializeOnboarding();
  // }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        {renderStep()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  }
});