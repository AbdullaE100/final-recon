import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import WelcomeScreen from '@/components/onboarding/WelcomeScreen';
import QuizScreen from '@/components/onboarding/QuizScreen';
import CommitmentScreen from '@/components/onboarding/CommitmentScreen';
import CompanionSelectionScreen, { CompanionChoice } from '@/components/onboarding/CompanionSelectionScreen';
import UsernameSetupScreen from '@/components/onboarding/UsernameSetupScreen';
import { storeData, STORAGE_KEYS, getData } from '@/utils/storage';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

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
  const [quizAnswers, setQuizAnswers] = useState({});
  const [selectedCompanion, setSelectedCompanion] = useState<CompanionChoice | null>(null);
  const [username, setUsername] = useState<string>('');

  // Steps in the onboarding flow
  const steps = [
    'username',
    'welcome',
    'quiz',
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
  const handleQuizComplete = (answers: Record<string, any>) => {
    setQuizAnswers(answers);
    handleNext();
  };

  // Handle companion selection
  const handleCompanionSelect = (companion: CompanionChoice) => {
    setSelectedCompanion(companion);
  };

  // This function is called when the user confirms their companion choice
  const handleCompanionSelectionComplete = async () => {
    await completeOnboardingAndNavigate();
  };

  // Complete onboarding and navigate to subscription screen
  const completeOnboardingAndNavigate = async () => {
    if (!selectedCompanion) {
      console.warn("Companion not selected before attempting to complete onboarding.");
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
    
    // Create anonymous user profile in Supabase if we have Supabase connection and not logged in
    try {
      if (username && !user) {
        // Generate a unique anonymous ID
        const deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        // Create or update user profile in Supabase
        const { data, error } = await supabase
          .from('user_profiles')
          .upsert({
            device_id: deviceId,
            username: username,
            preferences: updatedPreferences,
            created_at: new Date().toISOString(),
            last_sync: new Date().toISOString()
          })
          .select();
          
        if (error) {
          console.warn('Failed to save user profile to Supabase:', error.message);
        } else {
          console.log('Successfully created user profile in Supabase');
          
          // Store the deviceId for future reference
          await storeData(STORAGE_KEYS.DEVICE_ID, deviceId);
        }
      }
    } catch (error) {
      console.warn('Error creating user profile:', error);
      // Continue even if Supabase sync fails - local data is still saved
    }
    
    try {
      // Navigate to the trial subscription screen with parameters
      router.replace({
        pathname: '/free-trial',
        params: { 
          from: 'onboarding',
          price: '3.99',
          selectedCompanion: selectedCompanion || 'default'
        }
      } as any);
    } catch (error) {
      console.error('Error navigating to trial subscription:', error);
      // Fallback to main app if navigation fails
      router.replace('/(tabs)' as any);
    }
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
      case 'commitment':
        return <CommitmentScreen onSign={handleNext} />;
      case 'companionSelection':
        return <CompanionSelectionScreen onSelect={handleCompanionSelect} onComplete={handleCompanionSelectionComplete} />;
      default:
        return null;
    }
  };

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